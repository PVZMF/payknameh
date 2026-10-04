import { beforeEach, describe, expect, it, vi } from "vitest";

const store = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
vi.mock("next/headers", () => ({ cookies: () => Promise.resolve(store) }));
const resolveSession = vi.fn();
vi.mock("@/server/services/auth", () => ({ resolveSession }));
let appEnv = "local";
const redirect = vi.fn((path: string) => {
  throw new Error(`redirect:${path}`);
});
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/env", () => ({ getEnv: () => ({ APP_ENV: appEnv }) }));

const { SESSION_COOKIE, clearSessionCookie, getCurrentUser, requireHost, setSessionCookie } =
  await import("@/app/_lib/auth");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("session cookie", () => {
  it("has no user without a cookie and never asks the database", async () => {
    store.get.mockReturnValue(undefined);
    expect(await getCurrentUser()).toBeNull();
    expect(resolveSession).not.toHaveBeenCalled();
  });

  it("checks the cookie token against the database", async () => {
    store.get.mockReturnValue({ value: "token-1" });
    resolveSession.mockResolvedValue({ userId: "u1", sessionId: "s1" });
    expect(await getCurrentUser()).toEqual({ userId: "u1", sessionId: "s1" });
    expect(store.get).toHaveBeenCalledWith(SESSION_COOKIE);
    expect(resolveSession).toHaveBeenCalledWith("token-1");
  });

  it.each([
    ["local", false],
    ["development", true],
    ["production", true],
  ])("sets an httpOnly, SameSite=Lax, host-only cookie on %s (secure: %s)", async (env, secure) => {
    appEnv = env;
    const expiresAt = new Date("2026-11-04T00:00:00Z");
    await setSessionCookie("token-2", expiresAt);
    expect(store.set).toHaveBeenCalledWith(SESSION_COOKIE, "token-2", {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      expires: expiresAt,
    });
    const options = store.set.mock.calls[0]?.[2] as Record<string, unknown>;
    expect(options).not.toHaveProperty("domain");
  });

  it("turns a valid session into a host actor", async () => {
    store.get.mockReturnValue({ value: "token-3" });
    resolveSession.mockResolvedValue({ userId: "u3", sessionId: "s3" });
    expect(await requireHost()).toEqual({ type: "host", userId: "u3" });
  });

  it("sends a request without a session to the login page", async () => {
    store.get.mockReturnValue(undefined);
    await expect(requireHost()).rejects.toThrow("redirect:/login");
  });

  it("clears the cookie", async () => {
    await clearSessionCookie();
    expect(store.delete).toHaveBeenCalledWith(SESSION_COOKIE);
  });
});
