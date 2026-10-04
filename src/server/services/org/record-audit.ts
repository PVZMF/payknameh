import "server-only";
import { getDb, type DbExecutor } from "@/server/db/client";
import { auditLogs } from "@/server/db/schema";

// Tech §8, §11; Business §7 (host audit log): sensitive actions are recorded append-only.
// Write the audit row in the same transaction as the action it describes.

export type AuditActorType = (typeof auditLogs.$inferInsert)["actorType"];

export interface AuditEntry {
  actorType: AuditActorType;
  /** User ID for HOST and STAFF, household ID for GUEST, null for SYSTEM. */
  actorId: string | null;
  /** module.verb-in-past, e.g. "guest.token-rotated". */
  action: `${string}.${string}`;
  entityType: string;
  entityId: string | null;
  eventId: string | null;
  /** Required for STAFF (Tech §11); the database refuses a staff row without one. */
  reason?: string;
}

/**
 * Appends one audit row. IDs only: never put names, phone numbers or message text here.
 * Pass the caller's transaction so the row commits or rolls back with the action.
 */
export async function recordAudit(entry: AuditEntry, db: DbExecutor = getDb()): Promise<void> {
  await db.insert(auditLogs).values({ ...entry, reason: entry.reason ?? null });
}
