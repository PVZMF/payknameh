"use server";

import { redirect } from "next/navigation";
import { requireHost } from "@/app/_lib/auth";
import { createEventSchema } from "@/domain/event/event";
import { createEvent } from "@/server/services/event";
import { EVENT_STRINGS } from "@/strings/event";

export type CreateEventFormState = { error: string } | undefined;

/** Standards §2 / Tech §3.4: parse with zod, call the service, nothing else. */
export async function createEventAction(
  _previous: CreateEventFormState,
  form: FormData,
): Promise<CreateEventFormState> {
  const actor = await requireHost();
  const input = createEventSchema.safeParse({
    title: form.get("title") ?? "",
    brideName: form.get("brideName") ?? undefined,
    groomName: form.get("groomName") ?? undefined,
    parents: form.get("parents") ?? undefined,
  });
  if (!input.success) return { error: EVENT_STRINGS.errors.INVALID_INPUT };
  const result = await createEvent(actor, input.data);
  if (!result.ok) return { error: EVENT_STRINGS.errors[result.code] };
  redirect(`/events/${result.value.eventId}`);
}
