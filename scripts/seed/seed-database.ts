import { normalizePhone } from "@/domain/auth/phone";
import { createEventSchema } from "@/domain/event/event";
import { getDb } from "@/server/db/client";
import { createEvent, listEventsForHost } from "@/server/services/event";
import { ensureHostAccount } from "@/server/services/org";

// Standards §3 (Data rules): the seed lives in the repo and is identical for development and
// staging. Phase 1 seeds a host, their organization and one event; later phases add sessions,
// the guest tree and responses. Running it twice changes nothing.

/** Sample host; log in locally with 09000000001 and the code from the dev server terminal. */
export const SEED_HOST_PHONE = "09000000001";

export const SEED_EVENT = {
  title: "عروسی نمونه",
  brideName: "سارا",
  groomName: "علی",
  parents: "خانواده‌های محمدی و رضایی",
};

export type SeedResult = { userId: string; eventId: string; created: boolean };

export async function seedDatabase(): Promise<SeedResult> {
  const phone = normalizePhone(SEED_HOST_PHONE);
  if (!phone.ok) throw new Error("seed phone is not a valid number");
  const { userId } = await getDb().transaction((tx) => ensureHostAccount(phone.value, tx));
  const host = { type: "host", userId } as const;

  const [existing] = await listEventsForHost(host);
  if (existing) return { userId, eventId: existing.id, created: false };

  const created = await createEvent(host, createEventSchema.parse(SEED_EVENT));
  if (!created.ok) throw new Error(`seed event not created: ${created.code}`);
  return { userId, eventId: created.value.eventId, created: true };
}
