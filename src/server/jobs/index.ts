import type { Job, PgBoss } from "pg-boss";
import { handlePruneRateLimits } from "@/server/jobs/auth-prune-rate-limits";
import { handleInfraPing } from "@/server/jobs/infra-ping";
import { captureUnexpected } from "@/server/lib/error-tracking";
import type { QueueName } from "@/server/lib/queue";

/** Handler for every queue in QUEUES; adding a queue without a handler is a type error. */
const HANDLERS = {
  "infra.ping": handleInfraPing,
  "auth.prune-rate-limits": handlePruneRateLimits,
} satisfies Record<QueueName, unknown>;

/**
 * Reports a failing batch to GlitchTip, then rethrows so pg-boss still retries it
 * (Tech §7.5). Only job IDs go with the report, never job data.
 */
export function reportFailures<T>(
  queue: QueueName,
  handler: (jobs: Job<T>[]) => Promise<void>,
): (jobs: Job<T>[]) => Promise<void> {
  return async (jobs) => {
    try {
      await handler(jobs);
    } catch (error) {
      captureUnexpected(error, { queue, jobIds: jobs.map((job) => job.id) });
      throw error;
    }
  };
}

/** Recurring jobs as cron in UTC; pg-boss runs each once per tick across all workers. */
export const SCHEDULES = [
  { queue: "auth.prune-rate-limits", cron: "30 0 * * *" },
] as const satisfies {
  queue: QueueName;
  cron: string;
}[];

export async function registerJobs(boss: PgBoss): Promise<void> {
  await boss.work("infra.ping", reportFailures("infra.ping", HANDLERS["infra.ping"]));
  await boss.work(
    "auth.prune-rate-limits",
    reportFailures("auth.prune-rate-limits", HANDLERS["auth.prune-rate-limits"]),
  );
  for (const { queue, cron } of SCHEDULES) await boss.schedule(queue, cron);
}
