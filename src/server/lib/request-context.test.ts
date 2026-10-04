import { describe, expect, it } from "vitest";
import { currentRequestId, runWithRequestId } from "@/server/lib/request-context";

describe("runWithRequestId", () => {
  it("exposes the given request ID inside the callback only", () => {
    expect(runWithRequestId("req-42", () => currentRequestId())).toBe("req-42");
    expect(currentRequestId()).toBeUndefined();
  });

  it.each([null, undefined, ""])("generates a UUID when the incoming ID is %j", (incoming) => {
    const id = runWithRequestId(incoming, () => currentRequestId());
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
