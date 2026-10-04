import { describe, expect, it } from "vitest";
import { roleSatisfies } from "@/domain/org/actor";

describe("roleSatisfies", () => {
  it("lets an OWNER do everything and an EDITOR only editor work", () => {
    expect(roleSatisfies("OWNER", "OWNER")).toBe(true);
    expect(roleSatisfies("OWNER", "EDITOR")).toBe(true);
    expect(roleSatisfies("EDITOR", "EDITOR")).toBe(true);
    expect(roleSatisfies("EDITOR", "OWNER")).toBe(false);
  });
});
