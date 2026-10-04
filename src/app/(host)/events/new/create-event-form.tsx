"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createEventAction, type CreateEventFormState } from "@/app/(host)/events/new/actions";
import { EVENT_STRINGS } from "@/strings/event";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import { Label } from "@/ui/components/label";

function Field({
  id,
  label,
  hint,
  ...input
}: { id: string; label: string; hint?: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} aria-describedby={hint ? `${id}-hint` : undefined} {...input} />
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

export function CreateEventForm() {
  const [state, action, pending] = useActionState<CreateEventFormState, FormData>(
    createEventAction,
    undefined,
  );
  return (
    <form action={action} className="flex flex-col gap-5">
      <Field
        id="title"
        label={EVENT_STRINGS.titleLabel}
        placeholder={EVENT_STRINGS.titlePlaceholder}
        maxLength={120}
        required
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="brideName"
          label={EVENT_STRINGS.brideLabel}
          hint={EVENT_STRINGS.optional}
          maxLength={60}
        />
        <Field
          id="groomName"
          label={EVENT_STRINGS.groomLabel}
          hint={EVENT_STRINGS.optional}
          maxLength={60}
        />
      </div>
      <Field
        id="parents"
        label={EVENT_STRINGS.parentsLabel}
        hint={EVENT_STRINGS.parentsHint}
        maxLength={300}
      />
      {state && (
        <p id="create-event-error" role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? EVENT_STRINGS.creating : EVENT_STRINGS.create}
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link href="/events">{EVENT_STRINGS.cancel}</Link>
        </Button>
      </div>
    </form>
  );
}
