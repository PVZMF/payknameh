import "server-only";
import { randomInt } from "node:crypto";
import { sql } from "drizzle-orm";
import { normalizePhone } from "@/domain/auth/phone";
import { OTP_LENGTH, OTP_REQUEST_LIMITS, OTP_TTL_SECONDS } from "@/domain/auth/otp";
import { err, ok, type Err, type Ok } from "@/domain/shared/result";
import { getDb } from "@/server/db/client";
import { otpChallenges } from "@/server/db/schema";
import { uuidv7 } from "@/server/db/uuidv7";
import { getLogger } from "@/server/lib/logger";
import { getSmsProvider, type SmsProvider } from "@/server/providers/sms";
import { hashOtp } from "@/server/services/auth/otp-hash";
import { consumeRateLimit } from "@/server/services/auth/rate-limit";

const log = getLogger("auth");

export type RequestOtpResult =
  | Ok<{ challengeId: string; expiresAt: Date; resendAfterSeconds: number }>
  | Err<"PHONE_INVALID" | "SMS_SEND_FAILED">
  | { ok: false; code: "OTP_RATE_LIMITED"; retryAfterSeconds: number };

/**
 * A host asks for a login code (MVP §3.1, Tech §7.3): 6 random digits, stored only as an
 * HMAC, valid 2 minutes, sent through SmsProvider. Limited per IP and per phone, separately
 * (MVP §7). `ip` is null when the entrypoint could not determine one; such requests share
 * one bucket.
 */
export async function requestOtp(
  input: { phone: string; ip: string | null },
  deps: { sms?: SmsProvider } = {},
): Promise<RequestOtpResult> {
  const phone = normalizePhone(input.phone);
  if (!phone.ok) return phone;

  // IP first: an attacker rotating phone numbers is stopped before any per-phone counter grows.
  const limits = [
    [OTP_REQUEST_LIMITS.ipHourly, input.ip ?? "unknown"],
    [OTP_REQUEST_LIMITS.phoneCooldown, phone.value],
    [OTP_REQUEST_LIMITS.phoneHourly, phone.value],
  ] as const;
  for (const [rule, key] of limits) {
    const decision = await consumeRateLimit(rule, key);
    if (!decision.allowed) {
      log.info({ rule: rule.name }, "otp request rate limited");
      return { ok: false, code: "OTP_RATE_LIMITED", retryAfterSeconds: decision.retryAfterSeconds };
    }
  }

  const code = randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, "0");
  const challengeId = uuidv7();
  const [challenge] = await getDb()
    .insert(otpChallenges)
    .values({
      id: challengeId,
      phoneE164: phone.value,
      codeHash: hashOtp(challengeId, code),
      expiresAt: sql`now() + make_interval(secs => ${OTP_TTL_SECONDS})`,
    })
    .returning({ id: otpChallenges.id, expiresAt: otpChallenges.expiresAt });
  if (!challenge) throw new Error("otp challenge insert returned no row");

  const sms = deps.sms ?? getSmsProvider();
  const sent = await sms.sendOtp({ to: phone.value, code, idempotencyKey: challenge.id });
  if (!sent.ok) {
    log.warn({ challengeId: challenge.id, phone: phone.value }, "otp sms failed");
    return err("SMS_SEND_FAILED");
  }

  log.info({ challengeId: challenge.id, phone: phone.value }, "otp requested");
  return ok({
    challengeId: challenge.id,
    expiresAt: challenge.expiresAt,
    resendAfterSeconds: OTP_REQUEST_LIMITS.phoneCooldown.windowSeconds,
  });
}
