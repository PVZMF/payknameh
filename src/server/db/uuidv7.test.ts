import { describe, expect, it } from "vitest";
import { uuidv7 } from "@/server/db/uuidv7";

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("uuidv7", () => {
  it("has the version 7 and RFC 9562 variant bits", () => {
    expect(uuidv7()).toMatch(UUID_V7);
  });

  it("encodes the timestamp in the first 48 bits", () => {
    const now = Date.UTC(2026, 9, 4);
    const hex = uuidv7(now).replaceAll("-", "").slice(0, 12);
    expect(parseInt(hex, 16)).toBe(now);
  });

  it("sorts by creation time", () => {
    const ids = [uuidv7(1_000), uuidv7(2_000), uuidv7(3_000)];
    expect([...ids].sort()).toEqual(ids);
  });

  it("is unique", () => {
    expect(new Set(Array.from({ length: 1000 }, () => uuidv7())).size).toBe(1000);
  });
});
