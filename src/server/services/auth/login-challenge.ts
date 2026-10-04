import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { OTP_REQUEST_LIMITS } from "@/domain/auth/otp";
import type { PhoneE164 } from "@/domain/auth/phone";
import { getDb } from "@/server/db/client";
import { otpChallenges } from "@/server/db/schema";
import { requestOtp, type RequestOtpResult } from "@/server/services/auth/request-otp";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * What the code page needs about an open challenge: where the code went and when a new one
 * may be asked for. Null for unknown or already-used challenges. The phone number stays on
 * the server; the page shows it masked.
 */
export async function describeChallenge(
  challengeId: string,
): Promise<{ phone: PhoneE164; resendInSeconds: number } | null> {
  if (!UUID.test(challengeId)) return null;
  const cooldown = OTP_REQUEST_LIMITS.phoneCooldown.windowSeconds;
  const [challenge] = await getDb()
    .select({
      phone: otpChallenges.phoneE164,
      resendInSeconds: sql<number>`greatest(0, ceil(extract(epoch from ${otpChallenges.createdAt} + make_interval(secs => ${cooldown}) - now())))::int`,
    })
    .from(otpChallenges)
    .where(and(eq(otpChallenges.id, challengeId), isNull(otpChallenges.consumedAt)));
  // Stored by requestOtp from normalizePhone(), so it is E.164.
  return challenge
    ? { phone: challenge.phone as PhoneE164, resendInSeconds: challenge.resendInSeconds }
    : null;
}

/** "Send the code again" from the code page, which knows only the challenge. */
export async function resendOtp(input: {
  challengeId: string;
  ip: string | null;
}): Promise<RequestOtpResult | { ok: false; code: "OTP_INVALID" }> {
  const challenge = await describeChallenge(input.challengeId);
  if (!challenge) return { ok: false, code: "OTP_INVALID" };
  return requestOtp({ phone: challenge.phone, ip: input.ip });
}
