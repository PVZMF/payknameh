import { PgBoss } from "pg-boss";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "@/server/db/client";
import { setupQueues } from "@/server/db/queue-setup";
import { QUEUE_SCHEMA } from "@/server/lib/queue";
import { checkHealth } from "@/server/lib/health";
import { getQueue } from "@/server/lib/queue";

afterAll(async () => {
  await (await getQueue()).stop({ graceful: false });
  await closeDb();
});

describe("queue (pg-boss as the app user)", () => {
  it("enqueues a job once per unique key (idempotent send)", async () => {
    const queue = await getQueue();
    const key = `ping-${crypto.randomUUID()}`;
    const first = await queue.send("infra.ping", { sentAt: "t1" }, { singletonKey: key });
    const second = await queue.send("infra.ping", { sentAt: "t2" }, { singletonKey: key });

    expect(first).toEqual(expect.any(String));
    expect(second).toBeNull();
  });
});

describe("setupQueues", () => {
  it("recreates a missing queue and leaves existing ones alone", async () => {
    const migrateUrl = process.env.DB_MIGRATE_URL ?? "";
    const boss = new PgBoss({
      connectionString: migrateUrl,
      schema: QUEUE_SCHEMA,
      supervise: false,
      schedule: false,
      migrate: false,
    });
    await boss.start();
    await boss.deleteQueue("infra.ping");
    expect(await boss.getQueue("infra.ping")).toBeNull();

    await setupQueues(migrateUrl);
    await setupQueues(migrateUrl);

    expect((await boss.getQueue("infra.ping"))?.policy).toBe("exclusive");
    await boss.stop({ graceful: false });
  });
});

describe("checkHealth", () => {
  it("reports database, queue lag, version and commit", async () => {
    const report = await checkHealth("app");
    expect(report).toMatchObject({
      status: "ok",
      service: "app",
      version: expect.any(String),
      commit: expect.any(String),
      checks: { database: { ok: true }, queue: { ok: true, lagSeconds: expect.any(Number) } },
    });
  });
});
