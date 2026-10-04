import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/server/db/client";
import { rateLimitHits } from "@/server/db/schema";
import { consumeRateLimit, pruneRateLimits, type RateLimitRule } from "@/server/services/auth";

// Each test uses its own rule name, so tests never share counters.
function rule(limit: number, windowSeconds = 60): RateLimitRule {
  return { name: `test-${randomUUID()}`, limit, windowSeconds };
}

afterAll(async () => {
  await closeDb();
});

describe("consumeRateLimit", () => {
  it("allows up to the limit in a window, then refuses with a retry time", async () => {
    const r = rule(3);
    const decisions = [];
    for (let i = 0; i < 4; i++) decisions.push(await consumeRateLimit(r, "+989121234567"));
    expect(decisions.slice(0, 3)).toEqual([
      { allowed: true, remaining: 2 },
      { allowed: true, remaining: 1 },
      { allowed: true, remaining: 0 },
    ]);
    const blocked = decisions[3];
    expect(blocked?.allowed).toBe(false);
    if (blocked && !blocked.allowed) {
      expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
      expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
    }
  });

  it("counts keys and rules separately", async () => {
    const a = rule(1);
    const b = rule(1);
    expect((await consumeRateLimit(a, "1.2.3.4")).allowed).toBe(true);
    expect((await consumeRateLimit(a, "1.2.3.4")).allowed).toBe(false);
    expect((await consumeRateLimit(a, "5.6.7.8")).allowed).toBe(true);
    expect((await consumeRateLimit(b, "1.2.3.4")).allowed).toBe(true);
  });

  it("stores only a hash of the key", async () => {
    const r = rule(5);
    await consumeRateLimit(r, "+989121234567");
    const rows = await getDb().select().from(rateLimitHits);
    expect(JSON.stringify(rows)).not.toContain("989121234567");
  });

  it("lets exactly `limit` of many parallel hits through", async () => {
    const r = rule(5);
    const decisions = await Promise.all(
      Array.from({ length: 20 }, () => consumeRateLimit(r, "burst")),
    );
    expect(decisions.filter((d) => d.allowed)).toHaveLength(5);
  });
});

describe("pruneRateLimits", () => {
  it("deletes windows older than the cut-off and keeps recent ones", async () => {
    const oldKey = `old-${randomUUID()}`;
    await getDb()
      .insert(rateLimitHits)
      .values({ keyHash: oldKey, windowStart: sql`now() - interval '2 days'`, count: 1 });
    const r = rule(5);
    await consumeRateLimit(r, "recent");

    expect(await pruneRateLimits()).toBeGreaterThanOrEqual(1);
    expect(
      await getDb().select().from(rateLimitHits).where(eq(rateLimitHits.keyHash, oldKey)),
    ).toEqual([]);
    const remaining = await getDb().select().from(rateLimitHits);
    expect(remaining.length).toBeGreaterThanOrEqual(1);
  });
});
