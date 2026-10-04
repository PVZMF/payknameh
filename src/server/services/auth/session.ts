import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { SESSION_TTL_SECONDS } from "@/domain/auth/otp";
import type { DbExecutor } from "@/server/db/client";
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
