import { index, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { id, timestamptz } from "@/server/db/columns";

// Module auth (Standards §1: OTP, session, rate limiting).

/**
 * Tech §2.8, §7.6: rate limiting on PostgreSQL with fixed time windows (Redis only under real
 * pressure). The key is a hash, so phone numbers and IPs are never stored here.
 */
export const rateLimitHits = pgTable(
  "rate_limit_hits",
  {
    keyHash: text().notNull(),
    windowStart: timestamptz().notNull(),
    count: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.keyHash, table.windowStart] }),
    // The daily prune deletes by age.
    index("rate_limit_hits_window_start_idx").on(table.windowStart),
  ],
);

/**
 * MVP §5 OTPChallenge / Tech §7.3: one login code request. The code is never stored, only
 * an HMAC bound to this challenge. Valid 2 minutes, at most 5 attempts, single use.
 */
export const otpChallenges = pgTable(
  "otp_challenges",
  {
    id: id(),
    // Named explicitly: snake_case would turn "E164" into "e_164".
    phoneE164: text("phone_e164").notNull(),
    codeHash: text().notNull(),
    expiresAt: timestamptz().notNull(),
    consumedAt: timestamptz(),
    attempts: integer().notNull().default(0),
    createdAt: timestamptz().notNull().defaultNow(),
  },
  (table) => [
    index("otp_challenges_phone_e164_created_at_idx").on(table.phoneE164, table.createdAt),
  ],
);
