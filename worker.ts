// Worker entrypoint (Tech §2.2): same codebase and image as the app, separate process.
// Started with `pnpm worker` locally and by the image's worker command in the cloud.
import { createServer } from "node:http";
import { PgBoss } from "pg-boss";
import { getEnv } from "@/env";
import { closeDb } from "@/server/db/client";
import { registerJobs } from "@/server/jobs";
import { checkHealth } from "@/server/lib/health";
import { getLogger } from "@/server/lib/logger";
import { QUEUE_SCHEMA } from "@/server/lib/queue";

const log = getLogger("worker");

async function main(): Promise<void> {
  const env = getEnv();

  const boss = new PgBoss({
    connectionString: env.DB_URL,
    schema: QUEUE_SCHEMA,
    // Schema and queues are installed by `pnpm db:migrate`; the app user has no DDL rights.
    migrate: false,
    createSchema: false,
    // Index rebuilds need table ownership, which only the migrator has.
    reindex: false,
  });
  boss.on("error", (error) => log.error({ err: error }, "pg-boss error"));
  await boss.start();
  await registerJobs(boss);

  const server = createServer((request, response) => {
    if (request.url !== "/health") {
      response.writeHead(404).end();
      return;
    }
    void checkHealth("worker").then((report) => {
      response
        .writeHead(report.status === "ok" ? 200 : 503, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        })
        .end(JSON.stringify(report));
    });
  });
  server.listen(env.WORKER_HEALTH_PORT);
  log.info({ port: env.WORKER_HEALTH_PORT }, "worker started");

  const shutdown = async (signal: string): Promise<void> => {
    log.info({ signal }, "worker stopping");
    server.close();
    await boss.stop({ graceful: true, timeout: 20_000 });
    await closeDb();
    process.exit(0);
  };
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((error: unknown) => {
  log.fatal({ err: error }, "worker failed to start");
  process.exit(1);
});
