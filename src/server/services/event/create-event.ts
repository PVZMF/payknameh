import "server-only";
import { and, asc, eq } from "drizzle-orm";
import type { CreateEventInput } from "@/domain/event/event";
import type { Actor } from "@/domain/org/actor";
import { err, ok, type Result } from "@/domain/shared/result";
import { getDb } from "@/server/db/client";
import { eventMembers, events, organizationMembers } from "@/server/db/schema";
import { getLogger } from "@/server/lib/logger";

const log = getLogger("event");

/**
 * A host creates an event (MVP §3.2): it belongs to the host's personal organization and the
 * creator becomes its OWNER, in one transaction. Only hosts create events.
 * Input is already parsed with createEventSchema at the entrypoint (Standards §2).
 */
export async function createEvent(
  actor: Actor,
  input: CreateEventInput,
): Promise<Result<{ eventId: string }, "EVENT_CREATE_DENIED">> {
  if (actor.type !== "host") return err("EVENT_CREATE_DENIED");

  const eventId = await getDb().transaction(async (tx) => {
    const [membership] = await tx
      .select({ organizationId: organizationMembers.organizationId })
      .from(organizationMembers)
      .where(
        and(eq(organizationMembers.userId, actor.userId), eq(organizationMembers.role, "OWNER")),
      )
      .orderBy(asc(organizationMembers.createdAt))
      .limit(1);
    // Every host gets a personal organization at first login (PK-028).
    if (!membership) throw new Error("host has no organization");

    const [event] = await tx
      .insert(events)
      .values({ organizationId: membership.organizationId, ...input })
      .returning({ id: events.id });
    if (!event) throw new Error("event insert returned no row");
    await tx
      .insert(eventMembers)
      .values({ eventId: event.id, userId: actor.userId, role: "OWNER" });
    return event.id;
  });

  log.info({ eventId, userId: actor.userId }, "event created");
  return ok({ eventId });
}
