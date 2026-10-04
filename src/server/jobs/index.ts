import type { Job, PgBoss } from "pg-boss";
import { handleInfraPing } from "@/server/jobs/infra-ping";
import { captureUnexpected } from "@/server/lib/error-tracking";
import type { QueueName } from "@/server/lib/queue";

/** Handler for every queue in QUEUES; adding a queue without a handler is a type error. */
const HANDLERS = {
  "infra.ping": handleInfraPing,
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

export async function registerJobs(boss: PgBoss): Promise<void> {
  await boss.work("infra.ping", reportFailures("infra.ping", HANDLERS["infra.ping"]));
}
