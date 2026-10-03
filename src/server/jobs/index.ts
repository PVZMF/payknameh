import type { PgBoss } from "pg-boss";
import { handleInfraPing } from "@/server/jobs/infra-ping";
import type { QueueName } from "@/server/lib/queue";

/** Handler for every queue in QUEUES; adding a queue without a handler is a type error. */
const HANDLERS = {
  "infra.ping": handleInfraPing,
} satisfies Record<QueueName, unknown>;

export async function registerJobs(boss: PgBoss): Promise<void> {
  await boss.work("infra.ping", HANDLERS["infra.ping"]);
}
