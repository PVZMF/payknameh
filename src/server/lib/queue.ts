import "server-only";
import { PgBoss, type Queue } from "pg-boss";
import { getEnv } from "@/env";

/** pg-boss lives in its own schema, created by the migrator (Standards §7). */
export const QUEUE_SCHEMA = "pgboss";

/**
 * Every queue the system uses (Standards §2: job names are module.verb). Queues are created
 * by `pnpm db:migrate`, so the app user never needs DDL rights. A queue's policy is fixed
 * once created; changing it means a new queue name.
 *
 * Tech §7.5: jobs are idempotent and protected from duplicate runs with a unique key. The
 * `exclusive` policy allows one queued-or-active job per singletonKey, so a repeated send
 * with the same key returns null.
 */
export const QUEUES = [
  // Sample job proving the worker path end to end; real jobs arrive with their modules.
  { name: "infra.ping", policy: "exclusive", retryLimit: 3 },
] as const satisfies readonly Queue[];

export type QueueName = (typeof QUEUES)[number]["name"];

let boss: PgBoss | undefined;

/** Sender for services; the app process never runs maintenance or migrations. */
export async function getQueue(): Promise<PgBoss> {
  if (!boss) {
    boss = new PgBoss({
      connectionString: getEnv().DB_URL,
      schema: QUEUE_SCHEMA,
      migrate: false,
      createSchema: false,
      supervise: false,
      schedule: false,
    });
    await boss.start();
  }
  return boss;
}
