import "server-only";
import { and, eq } from "drizzle-orm";
import {
  roleSatisfies,
  type Actor,
  type EventAccessError,
  type EventRole,
} from "@/domain/org/actor";
import { err, ok, type Result } from "@/domain/shared/result";
import { getDb, type DbExecutor } from "@/server/db/client";
import { eventMembers } from "@/server/db/schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EventAccess = { eventId: string; role: EventRole | "SYSTEM" };

/**
 * Checks that `actor` may work on an event with at least `minimum` role (MVP §8: all access
 * checks are server-side; Tech §7.1: inside services). Every service that touches an event
 * calls this first.
 * - host: needs an EventMember row; none → EVENT_NOT_FOUND, too low → EVENT_ACCESS_DENIED.
 * - system (jobs): allowed.
 * - guest and staff: never through here. Guests act through their token and only on their
 *   own household; staff open events through the staff panel with a recorded reason
 *   (Tech §11, PK-129).
 */
export async function requireEventAccess(
  actor: Actor,
  eventId: string,
  minimum: EventRole = "EDITOR",
  db: DbExecutor = getDb(),
): Promise<Result<EventAccess, EventAccessError>> {
  if (!UUID.test(eventId)) return err("EVENT_NOT_FOUND");
  if (actor.type === "system") return ok({ eventId, role: "SYSTEM" });
  if (actor.type !== "host") return err("EVENT_NOT_FOUND");

  const [member] = await db
    .select({ role: eventMembers.role })
    .from(eventMembers)
    .where(and(eq(eventMembers.eventId, eventId), eq(eventMembers.userId, actor.userId)));
  if (!member) return err("EVENT_NOT_FOUND");
  if (!roleSatisfies(member.role, minimum)) return err("EVENT_ACCESS_DENIED");
  return ok({ eventId, role: member.role });
}
