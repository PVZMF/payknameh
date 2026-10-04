import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/server/db/client";
import { auditLogs } from "@/server/db/schema";
import { recordAudit, type AuditEntry } from "@/server/services/org";

afterAll(async () => {
  await closeDb();
});

function entry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    actorType: "HOST",
    actorId: randomUUID(),
    action: "guest.token-rotated",
    entityType: "household",
    entityId: randomUUID(),
    eventId: randomUUID(),
    ...overrides,
  };
}

async function rowsFor(entityId: string | null) {
  if (!entityId) return [];
  return getDb().select().from(auditLogs).where(eq(auditLogs.entityId, entityId));
}

/** pg error code of a rejected statement (drizzle wraps the driver error in `cause`). */
async function errorCode(run: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await run();
  } catch (error) {
    const pg = (error as { cause?: { code?: string } }).cause ?? (error as { code?: string });
    return pg.code;
  }
  return undefined;
}

describe("recordAudit", () => {
  it("appends a row with IDs, action and time", async () => {
    const e = entry();
    await recordAudit(e);
    const [row] = await rowsFor(e.entityId);
    expect(row).toMatchObject({
      actorType: "HOST",
      actorId: e.actorId,
      action: "guest.token-rotated",
      entityType: "household",
      eventId: e.eventId,
      reason: null,
    });
    expect(row?.createdAt).toBeInstanceOf(Date);
  });

  it("joins the caller's transaction and rolls back with it", async () => {
    const e = entry();
    await getDb()
      .transaction(async (tx) => {
        await recordAudit(e, tx);
        tx.rollback();
      })
      .catch(() => undefined);
    expect(await rowsFor(e.entityId)).toEqual([]);
  });

  it("requires a reason for staff access (Tech §11)", async () => {
    expect(await errorCode(() => recordAudit(entry({ actorType: "STAFF" })))).toBe("23514");
    expect(await errorCode(() => recordAudit(entry({ actorType: "STAFF", reason: "  " })))).toBe(
      "23514",
    );
    const e = entry({ actorType: "STAFF", reason: "support ticket" });
    await recordAudit(e);
    expect(await rowsFor(e.entityId)).toHaveLength(1);
  });

  it("refuses an action that is not module.verb", async () => {
    expect(
      await errorCode(() =>
        recordAudit(entry({ action: "Token Rotated." as AuditEntry["action"] })),
      ),
    ).toBe("23514");
  });
});

describe("audit_logs is append-only", () => {
  it("refuses UPDATE, DELETE and TRUNCATE", async () => {
    const e = entry();
    await recordAudit(e);
    const id = e.entityId ?? "";
    expect(
      await errorCode(() =>
        getDb().update(auditLogs).set({ reason: "changed" }).where(eq(auditLogs.entityId, id)),
      ),
    ).toBe("42501");
    expect(await errorCode(() => getDb().delete(auditLogs).where(eq(auditLogs.entityId, id)))).toBe(
      "42501",
    );
    expect(await errorCode(() => getDb().execute(sql`TRUNCATE audit_logs`))).toBe("42501");
    expect(await rowsFor(e.entityId)).toHaveLength(1);
  });
});
