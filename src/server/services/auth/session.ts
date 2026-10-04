import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { SESSION_TTL_SECONDS } from "@/domain/auth/otp";
import { getDb, type DbExecutor } from "@/server/db/client";
import { authSessions } from "@/server/db/schema";

// Tech §7.3: 256-bit random token in the cookie, only its hash in the database.

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

/** Starts a 30-day session for a user and returns the token for the cookie. */
export async function createSession(
  userId: string,
  db: DbExecutor,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const [session] = await db
    .insert(authSessions)
    .values({
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt: sql`now() + make_interval(secs => ${SESSION_TTL_SECONDS})`,
    })
    .returning({ expiresAt: authSessions.expiresAt });
  if (!session) throw new Error("session insert returned no row");
  return { token, expiresAt: session.expiresAt };
}

/** Sliding expiry is refreshed at most this often, to keep page loads from writing. */
const SLIDE_AFTER_SECONDS = 3_600;

/**
 * The signed-in user for a cookie token, or null when the session is unknown, revoked or
 * expired. Each use pushes expiry 30 days ahead (Tech §7.3), at most once an hour.
 */
export async function resolveSession(
  token: string,
): Promise<{ sessionId: string; userId: string } | null> {
  const tokenHash = hashSessionToken(token);
  const [session] = await getDb()
    .select({
      sessionId: authSessions.id,
      userId: authSessions.userId,
      stale: sql<boolean>`${authSessions.lastUsedAt} < now() - make_interval(secs => ${SLIDE_AFTER_SECONDS})`,
    })
    .from(authSessions)
    .where(
      and(
        eq(authSessions.tokenHash, tokenHash),
        isNull(authSessions.revokedAt),
        gt(authSessions.expiresAt, sql`now()`),
      ),
    );
  if (!session) return null;

  if (session.stale) {
    await getDb()
      .update(authSessions)
      .set({
        lastUsedAt: sql`now()`,
        expiresAt: sql`now() + make_interval(secs => ${SESSION_TTL_SECONDS})`,
      })
      .where(eq(authSessions.id, session.sessionId));
  }
  return { sessionId: session.sessionId, userId: session.userId };
}
