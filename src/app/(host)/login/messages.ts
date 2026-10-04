import { toPersianDigits } from "@/domain/shared/digits";
import { AUTH_STRINGS } from "@/strings/auth";

type AuthError =
  | { code: Exclude<keyof typeof AUTH_STRINGS.errors, "OTP_RATE_LIMITED"> }
  | { code: "OTP_RATE_LIMITED"; retryAfterSeconds: number };

/** Standards §2: the Persian message for an error code; never a technical message. */
export function authErrorMessage(error: AuthError): string {
  if (error.code === "OTP_RATE_LIMITED") {
    return AUTH_STRINGS.errors.OTP_RATE_LIMITED(toPersianDigits(String(error.retryAfterSeconds)));
  }
  return AUTH_STRINGS.errors[error.code];
}
