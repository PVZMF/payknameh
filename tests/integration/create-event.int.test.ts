import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import type { PhoneE164 } from "@/domain/auth/phone";
import { createEventSchema } from "@/domain/event/event";
import type { Actor } from "@/domain/org/actor";
import { closeDb, getDb } from "@/server/db/client";
import { eventMembers, events, organizationMembers } from "@/server/db/schema";
import { createEvent } from "@/server/services/event";
import { ensureHostAccount, requireEventAccess } from "@/server/services/org";

afterAll(async () => {
  await closeDb();
});

async function host(): Promise<Extract<Actor, { type: "host" }>> {
  const phone = `+989${randomInt(100_000_000, 999_999_999)}` as PhoneE164;
  const { userId } = await getDb().transaction((tx) => ensureHostAccount(phone, tx));
  return { type: "host", userId };
}

describe("createEvent", () => {
  it("creates the event in the host's organization with the host as OWNER", async () => {
    const actor = await host();
    const input = createEventSchema.parse({
      title: "عروسی سارا و علی",
      brideName: "سارا",
      groomName: "علی",
    });
    const result = await createEvent(actor, input);
    if (!result.ok) throw new Error(result.code);
    const { eventId } = result.value;

    const [event] = await getDb().select().from(events).where(eq(events.id, eventId));
    const [org] = await getDb()
      .select({ id: organizationMembers.organizationId })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, actor.userId));
    expect(event).toMatchObject({
      organizationId: org?.id,
      title: "عروسی سارا و علی",
      brideName: "سارا",
      groomName: "علی",
      parents: null,
      eventType: "WEDDING",
      timezone: "Asia/Tehran",
    });
    expect(
      await getDb().select().from(eventMembers).where(eq(eventMembers.eventId, eventId)),
    ).toEqual([expect.objectContaining({ userId: actor.userId, role: "OWNER" })]);
    expect((await requireEventAccess(actor, eventId, "OWNER")).ok).toBe(true);
  });

  it("keeps each host's events apart", async () => {
    const a = await host();
    const b = await host();
    const created = await createEvent(a, createEventSchema.parse({ title: "رویداد الف" }));
    if (!created.ok) throw new Error(created.code);
    expect(await requireEventAccess(b, created.value.eventId)).toEqual({
      ok: false,
      code: "EVENT_NOT_FOUND",
    });
  });

  it("lets only hosts create events", async () => {
    const input = createEventSchema.parse({ title: "x" });
    for (const actor of [
      { type: "system", job: "test" },
      { type: "staff", userId: "00000000-0000-7000-8000-000000000000", staffRole: "ADMIN" },
    ] satisfies Actor[]) {
      expect(await createEvent(actor, input)).toEqual({ ok: false, code: "EVENT_CREATE_DENIED" });
    }
  });
});
