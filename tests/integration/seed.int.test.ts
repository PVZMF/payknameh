import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/server/db/client";
import { events, organizationMembers, users } from "@/server/db/schema";
import { SEED_EVENT, seedDatabase } from "../../scripts/seed/seed-database";

afterAll(async () => {
  await closeDb();
});

describe("seedDatabase", () => {
  it("creates the sample host, organization and event once", async () => {
    const first = await seedDatabase();
    const second = await seedDatabase();
    expect(second).toEqual({ ...first, created: false });

    const [user] = await getDb().select().from(users).where(eq(users.id, first.userId));
    expect(user?.phoneE164).toBe("+989000000001");
    expect(
      await getDb()
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, first.userId)),
    ).toHaveLength(1);
    const [event] = await getDb().select().from(events).where(eq(events.id, first.eventId));
    expect(event).toMatchObject({ ...SEED_EVENT, eventType: "WEDDING", timezone: "Asia/Tehran" });
  });
});
