import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { requireHost } from "@/app/_lib/auth";
import { getEvent, type EventDetails } from "@/server/services/event";

/**
 * The event for this request, shared by the layout and the page (React cache). No access →
 * the same 404 as a missing event, so IDs cannot be probed (MVP §8).
 */
export const loadEvent = cache(async (eventId: string): Promise<EventDetails> => {
  const result = await getEvent(await requireHost(), eventId);
  if (!result.ok) notFound();
  return result.value;
});
