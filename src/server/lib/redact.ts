// Tech §12 / Business §7: phone numbers masked; no names, personal messages, tokens or OTP
// codes in logs. Applied to every log object before it is written.

const REMOVED = "[REDACTED]";

/** Keys whose values never reach a log, matched case-insensitively. */
const REMOVED_KEYS = new Set(
  [
    "token",
    "accessToken",
    "guestToken",
    "sessionToken",
    "authorization",
    "cookie",
    "password",
    "secret",
    "otp",
    "otpCode",
    "code",
    "name",
    "firstName",
    "lastName",
    "displayName",
    "fullName",
    "personalNote",
    "personalMessage",
  ].map((key) => key.toLowerCase()),
);

const PHONE_KEY = /phone/i;
// Iranian mobiles in any form (+98912…, 98912…, 0912…), Latin, Persian or Arabic digits.
const PHONE_PATTERN = /(?:\+?(?:98|۹۸|٩٨)|[0۰٠])?[9۹٩][0-9۰-۹٠-٩]{9}(?![0-9۰-۹٠-٩])/g;
const INVITE_PATH = /\/i\/[A-Za-z0-9_-]+/g;

/** Keeps the last two digits so support can still tell numbers apart: ••••••••12. */
export function maskPhone(value: string): string {
  const digits = value.replace(/[^0-9۰-۹٠-٩]/g, "");
  return digits.length <= 2 ? "••" : `${"•".repeat(digits.length - 2)}${digits.slice(-2)}`;
}

function redactString(value: string): string {
  return value.replace(INVITE_PATH, "/i/[REDACTED]").replace(PHONE_PATTERN, maskPhone);
}

/** Returns a copy of a log value with personal data removed or masked. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[TRUNCATED]";
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (value instanceof Error) {
    return { type: value.name, message: redactString(value.message), stack: value.stack };
  }
  if (value === null || typeof value !== "object") return value;

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (REMOVED_KEYS.has(key.toLowerCase())) {
      result[key] = REMOVED;
    } else if (PHONE_KEY.test(key) && typeof item === "string") {
      result[key] = maskPhone(item);
    } else {
      result[key] = redact(item, depth + 1);
    }
  }
  return result;
}
