import { randomInt } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import { afterAll, describe, expect, it } from "vitest";
import type { PhoneE164 } from "@/domain/auth/phone";
import { closeDb, getDb } from "@/server/db/client";
import { authSessions } from "@/server/db/schema";
import { createSession, resolveSession } from "@/server/services/auth";
import { ensureHostAccount } from "@/server/services/org";

afterAll(async () => {
  await closeDb();
});

async function newSession() {
  const phone = `+989${randomInt(100_000_000, 999_999_999)}` as PhoneE164;
  const { userId } = await getDb().transaction((tx) => ensureHostAccount(phone, tx));
  const { token } = await createSession(userId, getDb());
  const [row] = await getDb().select().from(authSessions).where(eq(authSessions.userId, userId));
  if (!row) throw new Error("no session row");
  return { userId, token, sessionId: row.id };
}

async function setSession(sessionId: string, changes: PgUpdateSetSource<typeof authSessions>) {
  await getDb().update(authSessions).set(changes).where(eq(authSessions.id, sessionId));
}

describe("resolveSession", () => {
  it("returns the user for a valid token", async () => {
    const { userId, token, sessionId } = await newSession();
    expect(await resolveSession(token)).toEqual({ userId, sessionId });
  });

  it("returns null for an unknown, revoked or expired session", async () => {
    expect(await resolveSession("not-a-real-token")).toBeNull();

    const revoked = await newSession();
    await setSession(revoked.sessionId, { revokedAt: sql`now()` });
    expect(await resolveSession(revoked.token)).toBeNull();

    const expired = await newSession();
    await setSession(expired.sessionId, { expiresAt: sql`now() - interval '1 second'` });
    expect(await resolveSession(expired.token)).toBeNull();
  });

  it("slides expiry 30 days ahead when the session was last used over an hour ago", async () => {
    const { token, sessionId } = await newSession();
    await setSession(sessionId, {
      lastUsedAt: sql`now() - interval '2 hours'`,
      expiresAt: sql`now() + interval '1 day'`,
    });
    await resolveSession(token);
    const [row] = await getDb().select().from(authSessions).where(eq(authSessions.id, sessionId));
    const days = ((row?.expiresAt.getTime() ?? 0) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
  });

  it("does not write when the session was used within the hour", async () => {
    const { token, sessionId } = await newSession();
    await setSession(sessionId, { expiresAt: sql`now() + interval '1 day'` });
    await resolveSession(token);
    const [row] = await getDb().select().from(authSessions).where(eq(authSessions.id, sessionId));
    const days = ((row?.expiresAt.getTime() ?? 0) - Date.now()) / 86_400_000;
    expect(days).toBeLessThan(1.01);
  });
});
