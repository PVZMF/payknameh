import { describe, expect, it, vi } from "vitest";

const redirect = vi.fn((path: string) => {
  throw new Error(`redirect:${path}`);
});
vi.mock("next/navigation", () => ({ redirect }));
const getCurrentUser = vi.fn();
vi.mock("@/app/_lib/auth", () => ({ getCurrentUser }));

const { default: PanelHomePage } = await import("@/app/(host)/panel-home/page");

describe("panel home", () => {
  it("sends a signed-in host to their events", async () => {
    getCurrentUser.mockResolvedValue({ userId: "u1", sessionId: "s1" });
    await expect(PanelHomePage()).rejects.toThrow("redirect:/events");
  });

  it("sends everyone else to the login page", async () => {
    getCurrentUser.mockResolvedValue(null);
    await expect(PanelHomePage()).rejects.toThrow("redirect:/login");
  });
});
