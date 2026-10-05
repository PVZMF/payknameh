import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((path: string) => {
  throw new Error(`redirect:${path}`);
});
vi.mock("next/navigation", () => ({ redirect }));
const auth = { getCurrentUser: vi.fn(), clearSessionCookie: vi.fn() };
vi.mock("@/app/_lib/auth", () => auth);
const services = { revokeSession: vi.fn(), revokeAllSessions: vi.fn() };
vi.mock("@/server/services/auth", () => services);

const { logoutAction, logoutEverywhereAction } =
  await import("@/app/(host)/events/account-actions");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("account actions", () => {
  it("revokes this session, clears the cookie and goes to login", async () => {
    auth.getCurrentUser.mockResolvedValue({ userId: "u1", sessionId: "s1" });
    await expect(logoutAction()).rejects.toThrow("redirect:/login");
    expect(services.revokeSession).toHaveBeenCalledWith("s1");
    expect(auth.clearSessionCookie).toHaveBeenCalled();
  });

  it("revokes every session of the host", async () => {
    auth.getCurrentUser.mockResolvedValue({ userId: "u1", sessionId: "s1" });
    await expect(logoutEverywhereAction()).rejects.toThrow("redirect:/login");
    expect(services.revokeAllSessions).toHaveBeenCalledWith("u1");
  });

  it("still clears the cookie when the session is already gone", async () => {
    auth.getCurrentUser.mockResolvedValue(null);
    await expect(logoutAction()).rejects.toThrow("redirect:/login");
    await expect(logoutEverywhereAction()).rejects.toThrow("redirect:/login");
    expect(services.revokeSession).not.toHaveBeenCalled();
    expect(services.revokeAllSessions).not.toHaveBeenCalled();
    expect(auth.clearSessionCookie).toHaveBeenCalledTimes(2);
  });
});
