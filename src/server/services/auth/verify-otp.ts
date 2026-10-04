import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { OTP_MAX_ATTEMPTS, OTP_VERIFY_LIMITS } from "@/domain/auth/otp";
import type { PhoneE164 } from "@/domain/auth/phone";
import { toLatinDigits } from "@/domain/shared/digits";
import { err, ok, type Err, type Ok } from "@/domain/shared/result";
import { getDb } from "@/server/db/client";
import { otpChallenges } from "@/server/db/schema";
import { getLogger } from "@/server/lib/logger";
import { otpMatches } from "@/server/services/auth/otp-hash";
import { consumeRateLimit } from "@/server/services/auth/rate-limit";
import { createSession } from "@/server/services/auth/session";
import { ensureHostAccount } from "@/server/services/org";

const log = getLogger("auth");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type VerifyOtpResult =
  | Ok<{ userId: string; isNewUser: boolean; sessionToken: string; sessionExpiresAt: Date }>
  | Err<"OTP_INVALID" | "OTP_EXPIRED" | "OTP_ATTEMPTS_EXCEEDED">
  | { ok: false; code: "OTP_RATE_LIMITED"; retryAfterSeconds: number };

/**
 * Checks a login code (MVP §3.1, §11.2; Tech §7.3): at most 5 attempts per challenge, valid
 * 2 minutes, single use, limited per phone. On success the first login creates the account
 * (ensureHostAccount) and a session, in one transaction.
 */
export async function verifyOtp(input: {
  challengeId: string;
  code: string;
}): Promise<VerifyOtpResult> {
  const code = toLatinDigits(input.code).trim();
  if (!UUID.test(input.challengeId) || !/^\d{6}$/.test(code)) return err("OTP_INVALID");

  // Count the attempt first, atomically, so parallel guesses all count.
  const [challenge] = await getDb()
    .update(otpChallenges)
    .set({ attempts: sql`${otpChallenges.attempts} + 1` })
    .where(and(eq(otpChallenges.id, input.challengeId), isNull(otpChallenges.consumedAt)))
    .returning({
      phone: otpChallenges.phoneE164,
      codeHash: otpChallenges.codeHash,
      attempts: otpChallenges.attempts,
      expired: sql<boolean>`${otpChallenges.expiresAt} <= now()`,
    });
  if (!challenge) return err("OTP_INVALID");

  const limited = await consumeRateLimit(OTP_VERIFY_LIMITS.phoneHourly, challenge.phone);
  if (!limited.allowed) {
    return { ok: false, code: "OTP_RATE_LIMITED", retryAfterSeconds: limited.retryAfterSeconds };
  }
  if (challenge.expired) return err("OTP_EXPIRED");
  if (challenge.attempts > OTP_MAX_ATTEMPTS) return err("OTP_ATTEMPTS_EXCEEDED");
  if (!otpMatches(challenge.codeHash, input.challengeId, code)) return err("OTP_INVALID");

  const signedIn = await getDb().transaction(async (tx) => {
    // Single use: only one of two parallel correct verifications gets the row.
    const [consumed] = await tx
      .update(otpChallenges)
      .set({ consumedAt: sql`now()` })
      .where(and(eq(otpChallenges.id, input.challengeId), isNull(otpChallenges.consumedAt)))
      .returning({ id: otpChallenges.id });
    if (!consumed) return null;
    // The stored number was written by requestOtp from normalizePhone(), so it is E.164.
    const account = await ensureHostAccount(challenge.phone as PhoneE164, tx);
    const session = await createSession(account.userId, tx);
    return { account, session };
  });
  if (!signedIn) return err("OTP_INVALID");

  log.info(
    { userId: signedIn.account.userId, isNewUser: signedIn.account.created },
    "host signed in",
  );
  return ok({
    userId: signedIn.account.userId,
    isNewUser: signedIn.account.created,
    sessionToken: signedIn.session.token,
    sessionExpiresAt: signedIn.session.expiresAt,
  });
}
