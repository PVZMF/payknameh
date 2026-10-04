import { randomInt } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import type { PhoneE164 } from "@/domain/auth/phone";
import type { Actor } from "@/domain/org/actor";
import { closeDb, getDb } from "@/server/db/client";
import { eventMembers, events, organizations } from "@/server/db/schema";
import { uuidv7 } from "@/server/db/uuidv7";
import { ensureHostAccount, requireEventAccess } from "@/server/services/org";

// MVP §11.2: event ownership and EventMember access.

afterAll(async () => {
  await closeDb();
});

async function host(): Promise<Extract<Actor, { type: "host" }>> {
  const phone = `+989${randomInt(100_000_000, 999_999_999)}` as PhoneE164;
  const { userId } = await getDb().transaction((tx) => ensureHostAccount(phone, tx));
  return { type: "host", userId };
}

async function eventWith(members: { userId: string; role: "OWNER" | "EDITOR" }[]) {
  const [org] = await getDb().insert(organizations).values({ name: "Personal" }).returning();
  if (!org) throw new Error("no org");
  const [event] = await getDb()
    .insert(events)
    .values({ organizationId: org.id, title: "عروسی" })
    .returning();
  if (!event) throw new Error("no event");
  for (const m of members)
    await getDb()
      .insert(eventMembers)
      .values({ eventId: event.id, ...m });
  return event.id;
}

describe("requireEventAccess", () => {
  it("lets the OWNER do owner and editor work", async () => {
    const owner = await host();
    const eventId = await eventWith([{ userId: owner.userId, role: "OWNER" }]);
    expect(await requireEventAccess(owner, eventId, "OWNER")).toEqual({
      ok: true,
      value: { eventId, role: "OWNER" },
    });
    expect((await requireEventAccess(owner, eventId)).ok).toBe(true);
  });

  it("lets an EDITOR edit but not do owner-only work", async () => {
    const editor = await host();
    const eventId = await eventWith([{ userId: editor.userId, role: "EDITOR" }]);
    expect(await requireEventAccess(editor, eventId, "EDITOR")).toEqual({
      ok: true,
      value: { eventId, role: "EDITOR" },
    });
    expect(await requireEventAccess(editor, eventId, "OWNER")).toEqual({
      ok: false,
      code: "EVENT_ACCESS_DENIED",
    });
  });

  it("answers not found to a host who is not a member, so events cannot be probed", async () => {
    const owner = await host();
    const stranger = await host();
    const eventId = await eventWith([{ userId: owner.userId, role: "OWNER" }]);
    expect(await requireEventAccess(stranger, eventId)).toEqual({
      ok: false,
      code: "EVENT_NOT_FOUND",
    });
    expect(await requireEventAccess(stranger, uuidv7())).toEqual({
      ok: false,
      code: "EVENT_NOT_FOUND",
    });
    expect(await requireEventAccess(stranger, "1")).toEqual({ ok: false, code: "EVENT_NOT_FOUND" });
  });

  it("refuses guests and staff here, and allows system jobs", async () => {
    const owner = await host();
    const eventId = await eventWith([{ userId: owner.userId, role: "OWNER" }]);
    const guest: Actor = { type: "guest", householdId: uuidv7(), eventId };
    const staff: Actor = { type: "staff", userId: owner.userId, staffRole: "ADMIN" };
    expect(await requireEventAccess(guest, eventId)).toEqual({
      ok: false,
      code: "EVENT_NOT_FOUND",
    });
    expect(await requireEventAccess(staff, eventId)).toEqual({
      ok: false,
      code: "EVENT_NOT_FOUND",
    });
    expect(await requireEventAccess({ type: "system", job: "test" }, eventId, "OWNER")).toEqual({
      ok: true,
      value: { eventId, role: "SYSTEM" },
    });
  });
});
