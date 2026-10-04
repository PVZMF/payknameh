import { describe, expect, it } from "vitest";
import { createEventSchema } from "@/domain/event/event";

describe("createEventSchema", () => {
  it("applies the defaults and turns empty optional fields into null", () => {
    expect(
      createEventSchema.parse({ title: "  عروسی سارا و علی ", brideName: " ", groomName: "علی" }),
    ).toEqual({
      title: "عروسی سارا و علی",
      eventType: "WEDDING",
      brideName: null,
      groomName: "علی",
      parents: null,
      timezone: "Asia/Tehran",
    });
  });

  it("accepts any IANA time zone", () => {
    expect(createEventSchema.parse({ title: "x", timezone: "Europe/Berlin" }).timezone).toBe(
      "Europe/Berlin",
    );
  });

  it.each([
    [{ title: "   " }, "title"],
    [{ title: "x".repeat(121) }, "title"],
    [{ title: "x", brideName: "س".repeat(61) }, "brideName"],
    [{ title: "x", timezone: "Mars/Olympus" }, "timezone"],
    [{ title: "x", eventType: "BIRTHDAY" }, "eventType"],
  ])("rejects %j", (input, field) => {
    const result = createEventSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([field]);
  });
});
