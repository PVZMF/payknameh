import { requireHost } from "@/app/_lib/auth";
import { CreateEventForm } from "@/app/(host)/events/new/create-event-form";
import { EVENT_STRINGS } from "@/strings/event";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  await requireHost();
  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{EVENT_STRINGS.createTitle}</h1>
        <p className="text-muted-foreground">{EVENT_STRINGS.createIntro}</p>
      </div>
      <CreateEventForm />
    </main>
  );
}
