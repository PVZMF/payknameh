import { afterEach, describe, expect, it, vi } from "vitest";

const execFileSync = vi.fn();
vi.mock("node:child_process", () => ({ execFileSync }));

async function load(appCommit: string | undefined) {
  vi.resetModules();
  vi.doMock("@/env", () => ({ getEnv: () => ({ APP_COMMIT: appCommit }) }));
  return import("@/server/lib/build-info");
}

afterEach(() => {
  execFileSync.mockReset();
  vi.doUnmock("@/env");
});

describe("getBuildInfo", () => {
  it("uses the commit baked into the image", async () => {
    const { getBuildInfo } = await load("abc1234");
    expect(getBuildInfo()).toEqual({ version: expect.any(String), commit: "abc1234" });
    expect(execFileSync).not.toHaveBeenCalled();
  });

  it("falls back to git locally", async () => {
    execFileSync.mockReturnValue("def5678\n");
    const { getBuildInfo } = await load(undefined);
    expect(getBuildInfo().commit).toBe("def5678");
  });

  it("reports unknown when git is not available", async () => {
    execFileSync.mockImplementation(() => {
      throw new Error("git: not found");
    });
    const { getBuildInfo } = await load(undefined);
    expect(getBuildInfo().commit).toBe("unknown");
  });
});
