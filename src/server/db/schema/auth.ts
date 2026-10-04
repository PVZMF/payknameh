import { index, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { timestamptz } from "@/server/db/columns";

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
