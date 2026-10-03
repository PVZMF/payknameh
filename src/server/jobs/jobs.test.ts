import type { Job, PgBoss } from "pg-boss";
import { describe, expect, it, vi } from "vitest";

const info = vi.fn();
vi.mock("@/server/lib/logger", () => ({ getLogger: () => ({ info }) }));

const { registerJobs } = await import("@/server/jobs");
const { handleInfraPing } = await import("@/server/jobs/infra-ping");

describe("registerJobs", () => {
  it("registers a handler for every queue", async () => {
    const work = vi.fn().mockResolvedValue("worker-id");
    await registerJobs({ work } as unknown as PgBoss);
    expect(work).toHaveBeenCalledWith("infra.ping", handleInfraPing);
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
