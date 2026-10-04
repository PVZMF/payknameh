import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((path: string) => {
  throw new Error(`redirect:${path}`);
});
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/app/_lib/auth", () => ({
  requireHost: () => Promise.resolve({ type: "host", userId: "u1" }),
}));
const createEvent = vi.fn();
vi.mock("@/server/services/event", () => ({ createEvent }));

const { createEventAction } = await import("@/app/(host)/events/new/actions");

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createEventAction", () => {
  it("creates the event with parsed input and opens it", async () => {
    createEvent.mockResolvedValue({ ok: true, value: { eventId: "e1" } });
    await expect(
      createEventAction(
        undefined,
        form({ title: " عروسی ", brideName: "سارا", groomName: "", parents: "" }),
      ),
    ).rejects.toThrow("redirect:/events/e1");
    expect(createEvent).toHaveBeenCalledWith(
      { type: "host", userId: "u1" },
      {
        title: "عروسی",
        eventType: "WEDDING",
        brideName: "سارا",
        groomName: null,
        parents: null,
        timezone: "Asia/Tehran",
      },
    );
  });

  it("shows a Persian error for invalid input without calling the service", async () => {
    expect(await createEventAction(undefined, form({ title: "  " }))).toEqual({
      error: expect.stringContaining("عنوان"),
    });
    expect(createEvent).not.toHaveBeenCalled();
  });

  it("shows the service's error as Persian text", async () => {
    createEvent.mockResolvedValue({ ok: false, code: "EVENT_CREATE_DENIED" });
    expect(await createEventAction(undefined, form({ title: "x" }))).toEqual({
      error: expect.any(String),
    });
  });
});
