// Tech §7.3 OTP rules, shared by request (PK-027) and verify (PK-028).

export const OTP_LENGTH = 6;
export const OTP_TTL_SECONDS = 120;
export const OTP_MAX_ATTEMPTS = 5;

/**
 * MVP §7: OTP requests are limited per phone number and per IP, separately (SMS pumping).
 * The spec gives no numbers; these are the starting values. The per-phone cooldown is also
 * the resend countdown on the login page.
 */
export const OTP_REQUEST_LIMITS = {
  phoneCooldown: { name: "otp-request-phone-cooldown", limit: 1, windowSeconds: 60 },
  phoneHourly: { name: "otp-request-phone-hourly", limit: 5, windowSeconds: 3_600 },
  ipHourly: { name: "otp-request-ip-hourly", limit: 20, windowSeconds: 3_600 },
} as const;

export type RequestOtpError = "PHONE_INVALID" | "OTP_RATE_LIMITED" | "SMS_SEND_FAILED";

/**
 * Tech §7.6: OTP verify is limited per challenge (OTP_MAX_ATTEMPTS) and per phone, across all
 * of its challenges.
 */
export const OTP_VERIFY_LIMITS = {
  phoneHourly: { name: "otp-verify-phone-hourly", limit: 15, windowSeconds: 3_600 },
} as const;

/** OTP_INVALID covers wrong, unknown and already-used codes alike, so nothing is revealed. */
export type VerifyOtpError =
  "OTP_INVALID" | "OTP_EXPIRED" | "OTP_ATTEMPTS_EXCEEDED" | "OTP_RATE_LIMITED";

/** Tech §7.3: 30-day sliding session. */
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
