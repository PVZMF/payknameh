// Public API of the auth module (CLAUDE.md: other modules import only from here).
export {
  consumeRateLimit,
  pruneRateLimits,
  type RateLimitDecision,
  type RateLimitRule,
} from "@/server/services/auth/rate-limit";
