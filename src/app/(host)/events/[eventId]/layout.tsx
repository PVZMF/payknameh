import Link from "next/link";
import type { ReactNode } from "react";
import { loadEvent } from "@/app/(host)/events/[eventId]/load-event";
import { EVENT_STRINGS } from "@/strings/event";

// MVP §3.2: every event section lives in this shell; later phases fill in the sections.
const SECTIONS = [
  { key: "overview", ready: true },
  { key: "sessions", ready: false },
  { key: "guests", ready: false },
  { key: "invitation", ready: false },
  { key: "responses", ready: false },
  { key: "sending", ready: false },
] as const;

export default async function EventLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await loadEvent(eventId);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/events" className="text-sm text-muted-foreground hover:underline">
          {EVENT_STRINGS.backToEvents}
        </Link>
        <h1 className="text-2xl font-bold">{event.title}</h1>
      </div>
      <nav aria-label={event.title} className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2 border-b">
          {SECTIONS.map(({ key, ready }) => (
            <li key={key}>
              {ready ? (
                <Link
                  href={`/events/${eventId}`}
                  aria-current="page"
                  className="inline-block border-b-2 border-primary px-3 py-2 text-sm font-medium whitespace-nowrap"
                >
                  {EVENT_STRINGS.nav[key]}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm whitespace-nowrap text-muted-foreground"
                >
                  {EVENT_STRINGS.nav[key]}
                  <span className="rounded bg-muted px-1.5 text-xs">{EVENT_STRINGS.soon}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </div>
  );
}
