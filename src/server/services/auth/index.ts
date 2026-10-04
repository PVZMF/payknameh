// Public API of the auth module (CLAUDE.md: other modules import only from here).
export {
  consumeRateLimit,
  pruneRateLimits,
  type RateLimitDecision,
  type RateLimitRule,
} from "@/server/services/auth/rate-limit";
export { requestOtp, type RequestOtpResult } from "@/server/services/auth/request-otp";
export { createSession, hashSessionToken, resolveSession } from "@/server/services/auth/session";
export { verifyOtp, type VerifyOtpResult } from "@/server/services/auth/verify-otp";
