import { randomInt } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import type { PhoneE164 } from "@/domain/auth/phone";
import { createEventSchema } from "@/domain/event/event";
import type { Actor } from "@/domain/org/actor";
import { closeDb, getDb } from "@/server/db/client";
import { eventMembers } from "@/server/db/schema";
import { uuidv7 } from "@/server/db/uuidv7";
import { createEvent, getEvent, listEventsForHost } from "@/server/services/event";
import { ensureHostAccount } from "@/server/services/org";

afterAll(async () => {
  await closeDb();
});

async function host(): Promise<Extract<Actor, { type: "host" }>> {
  const phone = `+989${randomInt(100_000_000, 999_999_999)}` as PhoneE164;
  const { userId } = await getDb().transaction((tx) => ensureHostAccount(phone, tx));
  return { type: "host", userId };
}

async function create(actor: Actor, title: string, extra: Record<string, string> = {}) {
  const result = await createEvent(actor, createEventSchema.parse({ title, ...extra }));
  if (!result.ok) throw new Error(result.code);
  return result.value.eventId;
}

describe("listEventsForHost", () => {
  it("lists only the host's events, newest first, with their role", async () => {
    const me = await host();
    const other = await host();
    const first = await create(me, "اول");
    const second = await create(me, "دوم", { brideName: "سارا", groomName: "علی" });
    const shared = await create(other, "مشترک");
    await getDb()
      .insert(eventMembers)
      .values({ eventId: shared, userId: me.userId, role: "EDITOR" });
    await create(other, "دیگری");

    expect(await listEventsForHost(me)).toEqual([
      { id: shared, title: "مشترک", brideName: null, groomName: null, role: "EDITOR" },
      { id: second, title: "دوم", brideName: "سارا", groomName: "علی", role: "OWNER" },
      { id: first, title: "اول", brideName: null, groomName: null, role: "OWNER" },
    ]);
  });

  it("is empty for a new host and for non-host actors", async () => {
    expect(await listEventsForHost(await host())).toEqual([]);
    expect(await listEventsForHost({ type: "system", job: "test" })).toEqual([]);
  });
});

describe("getEvent", () => {
  it("returns the general info to a member and not-found to anyone else", async () => {
    const me = await host();
    const eventId = await create(me, "عروسی", { parents: "خانواده‌ها" });
    expect(await getEvent(me, eventId)).toEqual({
      ok: true,
      value: {
        id: eventId,
        title: "عروسی",
        brideName: null,
        groomName: null,
        parents: "خانواده‌ها",
        timezone: "Asia/Tehran",
        role: "OWNER",
      },
    });
    expect(await getEvent(await host(), eventId)).toEqual({ ok: false, code: "EVENT_NOT_FOUND" });
    expect(await getEvent(me, uuidv7())).toEqual({ ok: false, code: "EVENT_NOT_FOUND" });
    expect((await getEvent({ type: "system", job: "test" }, eventId)).ok).toBe(true);
  });
});
