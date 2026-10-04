import type { Job, PgBoss } from "pg-boss";
import { describe, expect, it, vi } from "vitest";

const info = vi.fn();
vi.mock("@/server/lib/logger", () => ({ getLogger: () => ({ info }) }));
const captureUnexpected = vi.fn();
vi.mock("@/server/lib/error-tracking", () => ({ captureUnexpected }));
const pruneRateLimits = vi.fn().mockResolvedValue(7);
vi.mock("@/server/services/auth", () => ({ pruneRateLimits }));

const { registerJobs, reportFailures } = await import("@/server/jobs");
const { handleInfraPing } = await import("@/server/jobs/infra-ping");

describe("registerJobs", () => {
  it("registers a handler for every queue and the daily schedules", async () => {
    const work = vi.fn().mockResolvedValue("worker-id");
    const schedule = vi.fn().mockResolvedValue(undefined);
    await registerJobs({ work, schedule } as unknown as PgBoss);
    expect(work).toHaveBeenCalledWith("infra.ping", expect.any(Function));
    expect(work).toHaveBeenCalledWith("auth.prune-rate-limits", expect.any(Function));
    expect(schedule).toHaveBeenCalledWith("auth.prune-rate-limits", "30 0 * * *");
  });
});

describe("handlePruneRateLimits", () => {
  it("prunes old windows and logs only the count", async () => {
    const { handlePruneRateLimits } = await import("@/server/jobs/auth-prune-rate-limits");
    await handlePruneRateLimits();
    expect(pruneRateLimits).toHaveBeenCalledWith();
    expect(info).toHaveBeenCalledWith({ deleted: 7 }, "rate limit windows pruned");
  });
});

describe("reportFailures", () => {
  const jobs = [{ id: "a", data: { secret: "never sent" } }] as Job<{ secret: string }>[];

  it("passes a successful batch through without reporting", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    await reportFailures("infra.ping", handler)(jobs);
    expect(handler).toHaveBeenCalledWith(jobs);
    expect(captureUnexpected).not.toHaveBeenCalled();
  });

  it("reports a failing batch by job ID only and rethrows so pg-boss retries", async () => {
    const error = new Error("boom");
    const wrapped = reportFailures("infra.ping", vi.fn().mockRejectedValue(error));
    await expect(wrapped(jobs)).rejects.toBe(error);
    expect(captureUnexpected).toHaveBeenCalledWith(error, { queue: "infra.ping", jobIds: ["a"] });
  });
});

describe("handleInfraPing", () => {
  it("logs each job in the batch with a fixed message", async () => {
    const jobs = [
      { id: "a", data: { sentAt: "t1" } },
      { id: "b", data: { sentAt: "t2" } },
    ] as Job<{ sentAt: string }>[];
    await handleInfraPing(jobs);
    expect(info).toHaveBeenCalledTimes(2);
    expect(info).toHaveBeenCalledWith({ jobId: "a", sentAt: "t1" }, "infra.ping handled");
  });
});
