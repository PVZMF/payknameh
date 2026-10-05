import { loadEvent } from "@/app/(host)/events/[eventId]/load-event";
import { EVENT_STRINGS } from "@/strings/event";

export const dynamic = "force-dynamic";

export default async function EventOverviewPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const event = await loadEvent((await params).eventId);
  return (
    <main className="flex flex-col gap-4">
      {event.brideName && event.groomName && (
        <p className="text-lg">{EVENT_STRINGS.couple(event.brideName, event.groomName)}</p>
      )}
      {event.parents && <p className="text-muted-foreground">{event.parents}</p>}
      <p className="rounded-lg border border-dashed p-4 text-muted-foreground">
        {EVENT_STRINGS.overviewNext}
      </p>
    </main>
  );
}
