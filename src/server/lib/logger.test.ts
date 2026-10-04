import { describe, expect, it, vi } from "vitest";
import { createRootLogger } from "@/server/lib/logger";
import { runWithRequestId } from "@/server/lib/request-context";

function capture() {
  const lines: string[] = [];
  return { lines, stream: { write: (line: string) => void lines.push(line) } };
}

describe("createRootLogger", () => {
  it("writes level, fixed message, module and request ID with personal data redacted", () => {
    const { lines, stream } = capture();
    const logger = createRootLogger({ level: "info", appEnv: "local" }, stream).child({
      module: "rsvp",
    });

    runWithRequestId("req-1", () =>
      logger.info({ phone: "09121234567", token: "secret-token" }, "rsvp saved"),
    );

    const entry = JSON.parse(lines[0] ?? "{}") as Record<string, unknown>;
    expect(entry).toMatchObject({
      level: "info",
      msg: "rsvp saved",
      module: "rsvp",
      requestId: "req-1",
      env: "local",
      token: "[REDACTED]",
    });
    expect(lines[0]).not.toContain("1234567");
    expect(lines[0]).not.toContain("secret-token");
  });

  it("omits requestId outside a request", () => {
    const { lines, stream } = capture();
    createRootLogger({ level: "info", appEnv: "local" }, stream).info("worker started");
    expect(JSON.parse(lines[0] ?? "{}")).not.toHaveProperty("requestId");
  });
});

describe("getLogger", () => {
  it("returns a child logger bound to the module, configured from the environment", async () => {
    vi.resetModules();
    vi.doMock("@/env", () => ({ getEnv: () => ({ LOG_LEVEL: "warn", APP_ENV: "staging" }) }));
    const { getLogger } = await import("@/server/lib/logger");

    const logger = getLogger("delivery");
    expect(logger.bindings()).toMatchObject({ module: "delivery", env: "staging" });
    expect(logger.level).toBe("warn");
    vi.doUnmock("@/env");
  });

  it("reads the environment only when the logger is first used", async () => {
    vi.resetModules();
    const getEnv = vi.fn(() => ({ LOG_LEVEL: "info", APP_ENV: "local" }));
    vi.doMock("@/env", () => ({ getEnv }));
    const { getLogger } = await import("@/server/lib/logger");

    const logger = getLogger("auth");
    expect(getEnv).not.toHaveBeenCalled();
    expect(logger.isLevelEnabled("info")).toBe(true);
    expect(getEnv).toHaveBeenCalled();
    vi.doUnmock("@/env");
  });
});
