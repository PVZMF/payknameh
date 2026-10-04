import Link from "next/link";
import { requireHost } from "@/app/_lib/auth";
import { listEventsForHost } from "@/server/services/event";
import { EVENT_STRINGS } from "@/strings/event";
import { Button } from "@/ui/components/button";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await listEventsForHost(await requireHost());
  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{EVENT_STRINGS.listTitle}</h1>
        {events.length > 0 && (
          <Button asChild>
            <Link href="/events/new">{EVENT_STRINGS.newEvent}</Link>
          </Button>
        )}
      </div>
      {events.length === 0 ? (
        <section className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-6">
          <h2 className="text-lg font-medium">{EVENT_STRINGS.emptyTitle}</h2>
          <p className="text-muted-foreground">{EVENT_STRINGS.emptyHint}</p>
          <Button asChild>
            <Link href="/events/new">{EVENT_STRINGS.newEvent}</Link>
          </Button>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/events/${event.id}`}
                className="flex items-center justify-between gap-4 rounded-lg border p-4 hover:bg-accent"
              >
                <span className="flex flex-col gap-1">
                  <span className="font-medium">{event.title}</span>
                  {event.brideName && event.groomName && (
                    <span className="text-sm text-muted-foreground">
                      {EVENT_STRINGS.couple(event.brideName, event.groomName)}
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {event.role === "OWNER" ? EVENT_STRINGS.ownerBadge : EVENT_STRINGS.editorBadge}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
