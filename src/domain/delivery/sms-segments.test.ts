import { describe, expect, it } from "vitest";
import { countSmsSegments } from "@/domain/delivery/sms-segments";

describe("countSmsSegments", () => {
  it("counts Persian text as UCS-2: 70 in one segment, 67 per segment after that", () => {
    expect(countSmsSegments("س".repeat(70))).toEqual({
      encoding: "UCS-2",
      length: 70,
      segments: 1,
    });
    expect(countSmsSegments("س".repeat(71))).toEqual({
      encoding: "UCS-2",
      length: 71,
      segments: 2,
    });
    expect(countSmsSegments("س".repeat(134)).segments).toBe(2);
    expect(countSmsSegments("س".repeat(135)).segments).toBe(3);
  });

  it("counts Latin-only text as GSM-7: 160 in one segment, 153 per segment after that", () => {
    expect(countSmsSegments("a".repeat(160))).toEqual({
      encoding: "GSM-7",
      length: 160,
      segments: 1,
    });
    expect(countSmsSegments("a".repeat(161)).segments).toBe(2);
    expect(countSmsSegments("a".repeat(307)).segments).toBe(3);
  });

  it("counts GSM extension characters twice", () => {
    expect(countSmsSegments("€[]")).toEqual({ encoding: "GSM-7", length: 6, segments: 1 });
  });

  it("switches to UCS-2 for one character outside GSM-7, e.g. a Persian digit or emoji", () => {
    expect(countSmsSegments(`code ۱`).encoding).toBe("UCS-2");
    expect(countSmsSegments("ok 🎉")).toEqual({ encoding: "UCS-2", length: 5, segments: 1 });
  });

  it("treats an empty message as one segment", () => {
    expect(countSmsSegments("")).toEqual({ encoding: "GSM-7", length: 0, segments: 1 });
  });
});
