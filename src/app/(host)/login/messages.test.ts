import { describe, expect, it } from "vitest";
import { authErrorMessage } from "@/app/(host)/login/messages";
import { AUTH_STRINGS } from "@/strings/auth";

describe("authErrorMessage", () => {
  it("has a Persian message for every error code", () => {
    for (const code of [
      "PHONE_INVALID",
      "SMS_SEND_FAILED",
      "OTP_INVALID",
      "OTP_EXPIRED",
      "OTP_ATTEMPTS_EXCEEDED",
    ] as const) {
      expect(authErrorMessage({ code })).toBe(AUTH_STRINGS.errors[code]);
    }
  });

  it("puts the wait in Persian digits", () => {
    expect(authErrorMessage({ code: "OTP_RATE_LIMITED", retryAfterSeconds: 42 })).toContain("۴۲");
  });
});
