import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();
vi.mock("@/server/db/client", () => ({ getPool: () => ({ query }) }));
vi.mock("@/env", () => ({ getEnv: () => ({ APP_ENV: "local" }) }));
vi.mock("@/server/lib/build-info", () => ({
  getBuildInfo: () => ({ version: "1.2.3", commit: "abc1234" }),
}));

const { checkHealth } = await import("@/server/lib/health");

const dbOk = () => Promise.resolve({ rows: [{ "?column?": 1 }] });
const queueRows = (lag: number | null, waiting = 0) =>
  Promise.resolve({ rows: [{ lag, waiting }] });

beforeEach(() => {
  query.mockReset();
});

describe("checkHealth", () => {
  it("is ok when the database answers and the queue keeps up", async () => {
    query.mockImplementationOnce(dbOk).mockImplementationOnce(() => queueRows(4, 2));
    expect(await checkHealth("worker")).toMatchObject({
      status: "ok",
      service: "worker",
      version: "1.2.3",
      commit: "abc1234",
      appEnv: "local",
      checks: { database: { ok: true }, queue: { ok: true, lagSeconds: 4, waiting: 2 } },
    });
  });

  it("treats an empty queue as zero lag", async () => {
    query.mockImplementationOnce(dbOk).mockImplementationOnce(() => queueRows(null));
    expect((await checkHealth("app")).checks.queue).toEqual({
      ok: true,
      lagSeconds: 0,
      waiting: 0,
    });
  });

  it("is degraded when the queue lags more than five minutes", async () => {
    query.mockImplementationOnce(dbOk).mockImplementationOnce(() => queueRows(301, 50));
    const report = await checkHealth("app");
    expect(report.status).toBe("degraded");
    expect(report.checks.queue.ok).toBe(false);
  });

  it("is degraded when the database is down", async () => {
    query.mockImplementation(() => Promise.reject(new Error("ECONNREFUSED")));
    const report = await checkHealth("app");
    expect(report.status).toBe("degraded");
    expect(report.checks.database.ok).toBe(false);
    expect(report.checks.queue).toEqual({ ok: false, lagSeconds: null, waiting: null });
  });

  it("gives up on a hanging database after the timeout", async () => {
    vi.useFakeTimers();
    query.mockReturnValue(new Promise(() => {}));
    const pending = checkHealth("app");
    await vi.advanceTimersByTimeAsync(2_500);
    const report = await pending;
    vi.useRealTimers();
    expect(report.checks.database.ok).toBe(false);
  });
});
