import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/env";

// Tech §7.3: the code is stored only as an HMAC. Binding it to the challenge ID means a code
// is worthless for any other challenge.

export function hashOtp(challengeId: string, code: string): string {
  return createHmac("sha256", getEnv().AUTH_OTP_SECRET)
    .update(`${challengeId}:${code}`)
    .digest("base64url");
}

/** Constant-time comparison of a typed code with the stored hash. */
export function otpMatches(storedHash: string, challengeId: string, code: string): boolean {
  const expected = Buffer.from(storedHash);
  const actual = Buffer.from(hashOtp(challengeId, code));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
