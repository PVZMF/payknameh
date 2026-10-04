import { index, integer, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { id, timestamptz } from "@/server/db/columns";
import { users } from "@/server/db/schema/org";

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

/**
 * Tech §7.3, §8 (AuthSession, named so to tell it from the event Session): a logged-in host.
 * The cookie holds a 256-bit random token; only its SHA-256 is stored. 30-day sliding expiry.
 */
export const authSessions = pgTable(
  "auth_sessions",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text().notNull().unique("auth_sessions_token_hash_unique"),
    expiresAt: timestamptz().notNull(),
    revokedAt: timestamptz(),
    lastUsedAt: timestamptz().notNull().defaultNow(),
    createdAt: timestamptz().notNull().defaultNow(),
  },
  (table) => [index("auth_sessions_user_id_idx").on(table.userId)],
);
