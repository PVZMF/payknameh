import "server-only";
import { getEnv } from "@/env";
import { getPool } from "@/server/db/client";
import { getBuildInfo } from "@/server/lib/build-info";
import { QUEUE_SCHEMA } from "@/server/lib/queue";

/** Queue lag above this marks the service degraded (Tech §13.6: alert on lagging queues). */
const MAX_QUEUE_LAG_SECONDS = 300;
const CHECK_TIMEOUT_MS = 2_000;

export interface HealthReport {
  status: "ok" | "degraded";
  service: "app" | "worker";
  version: string;
  commit: string;
  appEnv: string;
  checks: {
    database: { ok: boolean; latencyMs: number };
    queue: { ok: boolean; lagSeconds: number | null; waiting: number | null };
  };
}

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("health check timed out")), CHECK_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    // A finished check must not keep the process alive for the rest of the timeout.
    clearTimeout(timer);
  }
}

async function checkDatabase(): Promise<HealthReport["checks"]["database"]> {
  const started = performance.now();
  try {
    await withTimeout(getPool().query("SELECT 1"));
    return { ok: true, latencyMs: Math.round(performance.now() - started) };
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - started) };
  }
}

/** Age of the oldest job that is ready to run but not picked up yet. */
async function checkQueue(): Promise<HealthReport["checks"]["queue"]> {
  try {
    const { rows } = await withTimeout(
      getPool().query<{ lag: number | null; waiting: number }>(
        `SELECT extract(epoch FROM now() - min(start_after))::int AS lag, count(*)::int AS waiting
           FROM ${QUEUE_SCHEMA}.job
          WHERE state IN ('created', 'retry') AND start_after <= now()`,
      ),
    );
    const lag = rows[0]?.lag ?? 0;
    return { ok: lag <= MAX_QUEUE_LAG_SECONDS, lagSeconds: lag, waiting: rows[0]?.waiting ?? 0 };
  } catch {
    return { ok: false, lagSeconds: null, waiting: null };
  }
}

/** Health of the running process: DB connection, queue lag, version and commit. */
export async function checkHealth(service: HealthReport["service"]): Promise<HealthReport> {
  const [database, queue] = await Promise.all([checkDatabase(), checkQueue()]);
  const { version, commit } = getBuildInfo();
  return {
    status: database.ok && queue.ok ? "ok" : "degraded",
    service,
    version,
    commit,
    appEnv: getEnv().APP_ENV,
    checks: { database, queue },
  };
}
