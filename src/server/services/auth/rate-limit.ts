import "server-only";
import { createHash } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { rateLimitHits } from "@/server/db/schema";

// Tech §2.8, §7.6: one generic limiter on a PostgreSQL table with fixed time windows, keyed by
// any string (phone, IP, token, event). Used by OTP, guest routes, uploads and SMS sending.

export interface RateLimitRule {
  /** Stable name, part of the key: e.g. "otp-request-phone". */
  name: string;
  /** Hits allowed per window. */
  limit: number;
  windowSeconds: number;
}

export type RateLimitDecision =
  { allowed: true; remaining: number } | { allowed: false; retryAfterSeconds: number };

/** Keys are hashed so phone numbers and IPs never sit in the table. */
function keyHash(rule: RateLimitRule, key: string): string {
  return createHash("sha256").update(`${rule.name}\0${key}`).digest("base64url");
}

/**
 * Counts one hit for `key` under `rule` and says whether it is allowed. The count and the
 * window come from one atomic upsert on database time, so parallel requests and app
 * instances share one counter.
 */
export async function consumeRateLimit(
  rule: RateLimitRule,
  key: string,
): Promise<RateLimitDecision> {
  const window = rule.windowSeconds;
  const [row] = await getDb()
    .insert(rateLimitHits)
    .values({
      keyHash: keyHash(rule, key),
      windowStart: sql`to_timestamp(floor(extract(epoch from now()) / ${window}) * ${window})`,
      count: 1,
    })
    .onConflictDoUpdate({
      target: [rateLimitHits.keyHash, rateLimitHits.windowStart],
      set: { count: sql`${rateLimitHits.count} + 1` },
    })
    .returning({
      count: rateLimitHits.count,
      secondsLeft: sql<number>`ceil(extract(epoch from ${rateLimitHits.windowStart} + make_interval(secs => ${window}) - now()))::int`,
    });
  if (!row) throw new Error("rate limit upsert returned no row");
  return row.count <= rule.limit
    ? { allowed: true, remaining: rule.limit - row.count }
    : { allowed: false, retryAfterSeconds: Math.max(1, row.secondsLeft) };
}

/** Deletes windows older than `maxAgeSeconds`; returns how many rows went. */
export async function pruneRateLimits(maxAgeSeconds = 86_400): Promise<number> {
  const deleted = await getDb()
    .delete(rateLimitHits)
    .where(lt(rateLimitHits.windowStart, sql`now() - make_interval(secs => ${maxAgeSeconds})`))
    .returning({ keyHash: rateLimitHits.keyHash });
  return deleted.length;
}
