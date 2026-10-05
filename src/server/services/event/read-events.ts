import "server-only";
import { desc, eq } from "drizzle-orm";
import type { Actor, EventAccessError, EventRole } from "@/domain/org/actor";
import { ok, type Result } from "@/domain/shared/result";
import { getDb } from "@/server/db/client";
import { eventMembers, events } from "@/server/db/schema";
import { requireEventAccess } from "@/server/services/org";

export interface EventSummary {
  id: string;
  title: string;
  brideName: string | null;
  groomName: string | null;
  role: EventRole;
}

/** The host's events, newest first (MVP §3.2). Other actors have no event list. */
export async function listEventsForHost(actor: Actor): Promise<EventSummary[]> {
  if (actor.type !== "host") return [];
  return getDb()
    .select({
      id: events.id,
      title: events.title,
      brideName: events.brideName,
      groomName: events.groomName,
      role: eventMembers.role,
    })
    .from(eventMembers)
    .innerJoin(events, eq(events.id, eventMembers.eventId))
    .where(eq(eventMembers.userId, actor.userId))
    .orderBy(desc(events.createdAt));
}

export interface EventDetails extends EventSummary {
  parents: string | null;
  timezone: string;
}

/** One event's general info, after the access check (Tech §7.1). */
export async function getEvent(
  actor: Actor,
  eventId: string,
): Promise<Result<EventDetails, EventAccessError>> {
  const access = await requireEventAccess(actor, eventId);
  if (!access.ok) return access;
  const [event] = await getDb()
    .select({
      id: events.id,
      title: events.title,
      brideName: events.brideName,
      groomName: events.groomName,
      parents: events.parents,
      timezone: events.timezone,
    })
    .from(events)
    .where(eq(events.id, eventId));
  // The membership row cascades with the event, so access implies the event exists.
  if (!event) throw new Error("event vanished after the access check");
  // A system actor has no member role; the panel only shows events to hosts.
  return ok({ ...event, role: access.value.role === "SYSTEM" ? "OWNER" : access.value.role });
}
