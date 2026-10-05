import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { authSessions } from "@/server/db/schema";
import { getLogger } from "@/server/lib/logger";

const log = getLogger("auth");

// Tech §7.3: logout revokes the session in the database; "log out of all devices" revokes
// every open session of the user. A revoked session stops working on the next request.

/** Ends one session (this device). */
export async function revokeSession(sessionId: string): Promise<void> {
  await getDb()
    .update(authSessions)
    .set({ revokedAt: sql`now()` })
    .where(and(eq(authSessions.id, sessionId), isNull(authSessions.revokedAt)));
}

/** Ends every open session of a user; returns how many were open. */
export async function revokeAllSessions(userId: string): Promise<number> {
  const revoked = await getDb()
    .update(authSessions)
    .set({ revokedAt: sql`now()` })
    .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)))
    .returning({ id: authSessions.id });
  log.info({ userId, sessions: revoked.length }, "host logged out everywhere");
  return revoked.length;
}
