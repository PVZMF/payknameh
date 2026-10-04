import { describe, expect, it } from "vitest";
import { formatNumber, parseInteger, toLatinDigits, toPersianDigits } from "@/domain/shared/digits";

describe("formatNumber", () => {
  it("renders Persian digits with Persian thousands separators", () => {
    expect(formatNumber(12500)).toBe("۱۲٬۵۰۰");
  });

  it("accepts Intl options, e.g. one decimal place", () => {
    expect(formatNumber(2.5, { minimumFractionDigits: 1 })).toBe("۲٫۵");
  });

  it("formats bigint amounts (rials are bigint, Tech §7.2)", () => {
    expect(formatNumber(1_000_000n)).toBe("۱٬۰۰۰٬۰۰۰");
  });
});

describe("toPersianDigits / toLatinDigits", () => {
  it("converts digits only", () => {
    expect(toPersianDigits("Session 2 at 18:30")).toBe("Session ۲ at ۱۸:۳۰");
  });

  it("converts Arabic-Indic digits that are not Persian look-alikes", () => {
    expect(toLatinDigits("٤٥٦")).toBe("456");
  });

  it("converts Persian and Arabic digits to Latin", () => {
    expect(toLatinDigits("۰۹۱۲ ٣٤٥")).toBe("0912 345");
  });
});

describe("parseInteger", () => {
  it.each([
    ["۱۲", 12],
    ["١٢", 12],
    ["12", 12],
    ["۱۲٬۵۰۰", 12500],
    [" 3 ", 3],
    ["-۴", -4],
  ])("parses %j as %d", (input, expected) => {
    expect(parseInteger(input)).toBe(expected);
  });

  it.each(["", "۱.۵", "abc", "12a", "99999999999999999999"])("rejects %j", (input) => {
    expect(parseInteger(input)).toBeNull();
  });
});
