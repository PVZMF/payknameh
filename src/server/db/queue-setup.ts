import { PgBoss } from "pg-boss";
import { QUEUE_SCHEMA, QUEUES } from "@/server/lib/queue";

/**
 * Installs or upgrades the pg-boss schema and creates every registered queue, as the
 * migrator. Runs in `pnpm db:migrate`, before any app or worker process starts.
 */
export async function setupQueues(migrateUrl: string): Promise<void> {
  const boss = new PgBoss({
    connectionString: migrateUrl,
    schema: QUEUE_SCHEMA,
    supervise: false,
    schedule: false,
  });
  await boss.start();
  try {
    const existing = new Set((await boss.getQueues()).map((queue) => queue.name));
    for (const { name, ...options } of QUEUES) {
      if (!existing.has(name)) await boss.createQueue(name, options);
    }
  } finally {
    await boss.stop({ graceful: false });
  }
}
