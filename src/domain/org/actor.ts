// Tech §7.1: every service receives an explicit actor and checks access itself, so every
// entrypoint (panel, guest API, jobs, a future AI agent) gets the same rules.

export type Actor =
  | { type: "host"; userId: string }
  | { type: "guest"; householdId: string; eventId: string }
  | { type: "staff"; userId: string; staffRole: "SUPPORT" | "ADMIN" }
  | { type: "system"; job: string };

/** MVP §5 EventMember roles. */
export type EventRole = "OWNER" | "EDITOR";

const RANK: Record<EventRole, number> = { EDITOR: 1, OWNER: 2 };

/** Whether a member with `role` may do something that needs at least `minimum`. */
export function roleSatisfies(role: EventRole, minimum: EventRole): boolean {
  return RANK[role] >= RANK[minimum];
}

/**
 * EVENT_NOT_FOUND also covers "exists but you are not a member", so IDs cannot be probed
 * (MVP §8). EVENT_ACCESS_DENIED is only for members whose role is too low.
 */
export type EventAccessError = "EVENT_NOT_FOUND" | "EVENT_ACCESS_DENIED";
