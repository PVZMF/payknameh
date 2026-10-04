import { describe, expect, it } from "vitest";
import { maskPhoneForDisplay, normalizePhone, type PhoneE164 } from "@/domain/auth/phone";

const E164 = "+989121234567";

describe("normalizePhone", () => {
  it.each([
    "09121234567",
    "9121234567",
    "+989121234567",
    "989121234567",
    "00989121234567",
    "۰۹۱۲۱۲۳۴۵۶۷",
    "٠٩١٢١٢٣٤٥٦٧",
    "+۹۸ ۹۱۲ ۱۲۳ ۴۵۶۷",
    " 0912 123 4567 ",
    "0912-123-4567",
    "(0912) 123.4567",
    "‎09121234567‏",
    "‪+98 912 123 4567‬",
  ])("normalizes %j", (input) => {
    expect(normalizePhone(input)).toEqual({ ok: true, value: E164 });
  });

  it.each([
    "",
    "   ",
    "0912123456",
    "091212345678",
    "02112345678",
    "+442071234567",
    "+98 21 1234 5678",
    "98912123456",
    "0912abc4567",
    "+9809121234567",
    "۰۹۱۲۱۲۳۴۵۶۷۸۹",
  ])("rejects %j", (input) => {
    expect(normalizePhone(input)).toEqual({ ok: false, code: "PHONE_INVALID" });
  });
});

describe("maskPhoneForDisplay", () => {
  it("keeps the first four and last four digits of the local form", () => {
    expect(maskPhoneForDisplay(E164 as PhoneE164)).toBe("0912•••4567");
  });
});
