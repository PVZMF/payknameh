import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { describe, expect, it } from "vitest";
import {
  eventMembers,
  events,
  organizationMembers,
  organizations,
  users,
} from "@/server/db/schema";
import { inRollbackTransaction } from "../support/db";

// Tech §7.2: important rules hold in the database too, not only in code.

/** Runs a statement that must fail, inside a savepoint so the test transaction survives. */
async function expectPgError(db: NodePgDatabase, run: () => Promise<unknown>, code: string) {
  await db.execute(sql`SAVEPOINT expect_error`);
  let caught: unknown;
  try {
    await run();
  } catch (error) {
    caught = error;
  }
  await db.execute(sql`ROLLBACK TO SAVEPOINT expect_error`);
  const pgError = (caught as { cause?: { code?: string } } | undefined)?.cause ?? caught;
  expect((pgError as { code?: string } | undefined)?.code).toBe(code);
}

async function seed(db: NodePgDatabase) {
  const [organization] = await db.insert(organizations).values({ name: "شخصی" }).returning();
  const [user] = await db.insert(users).values({ phoneE164: "+989121234567" }).returning();
  if (!organization || !user) throw new Error("seed failed");
  const [event] = await db
    .insert(events)
    .values({ organizationId: organization.id, title: "عروسی" })
    .returning();
  if (!event) throw new Error("seed failed");
  return { organization, user, event };
}

describe("foundation schema", () => {
  it("applies the documented defaults", async () => {
    await inRollbackTransaction(async (db) => {
      const { organization, user, event } = await seed(db);
      expect(organization.type).toBe("PERSONAL");
      expect(user.staffRole).toBe("NONE");
      expect(event).toMatchObject({
        eventType: "WEDDING",
        timezone: "Asia/Tehran",
        version: 1,
        brideName: null,
        groomName: null,
        parents: null,
        archivedAt: null,
      });
      expect(event.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
    });
  });

  it("keeps phone numbers unique and in E.164 form", async () => {
    await inRollbackTransaction(async (db) => {
      await seed(db);
      await expectPgError(
        db,
        () => db.insert(users).values({ phoneE164: "+989121234567" }),
        "23505",
      );
      await expectPgError(db, () => db.insert(users).values({ phoneE164: "09121234567" }), "23514");
    });
  });

  it("allows each membership once and only with a known role", async () => {
    await inRollbackTransaction(async (db) => {
      const { organization, user, event } = await seed(db);
      await db
        .insert(organizationMembers)
        .values({ organizationId: organization.id, userId: user.id, role: "OWNER" });
      await expectPgError(
        db,
        () =>
          db
            .insert(organizationMembers)
            .values({ organizationId: organization.id, userId: user.id, role: "OWNER" }),
        "23505",
      );
      await db.insert(eventMembers).values({ eventId: event.id, userId: user.id, role: "OWNER" });
      await expectPgError(
        db,
        () =>
          db.insert(eventMembers).values({ eventId: event.id, userId: user.id, role: "EDITOR" }),
        "23505",
      );
      await expectPgError(
        db,
        () =>
          db.execute(
            sql`INSERT INTO event_members (event_id, user_id, role) VALUES (${event.id}, ${user.id}, 'VIEWER')`,
          ),
        "22P02",
      );
    });
  });

  it("rejects a blank event title", async () => {
    await inRollbackTransaction(async (db) => {
      const { organization } = await seed(db);
      await expectPgError(
        db,
        () => db.insert(events).values({ organizationId: organization.id, title: "   " }),
        "23514",
      );
    });
  });

  it("keeps events when their organization is deleted and drops members with the event", async () => {
    await inRollbackTransaction(async (db) => {
      const { organization, user, event } = await seed(db);
      await db.insert(eventMembers).values({ eventId: event.id, userId: user.id, role: "OWNER" });
      await expectPgError(
        db,
        () => db.delete(organizations).where(eq(organizations.id, organization.id)),
        "23001", // restrict_violation (ON DELETE RESTRICT)
      );
      await db.delete(events).where(eq(events.id, event.id));
      expect(await db.select().from(eventMembers).where(eq(eventMembers.userId, user.id))).toEqual(
        [],
      );
    });
  });
});
