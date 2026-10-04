import { sql } from "drizzle-orm";
import { check, index, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { id, timestamps, timestamptz, version } from "@/server/db/columns";
import { organizations } from "@/server/db/schema/org";

// Module event (Standards §1). MVP §2: Event is a container. Date, time and place belong to
// Session (phase 2), never to Event.

/** Business §9.1: wedding is the MVP's only type; other types are added by migration. */
export const eventType = pgEnum("event_type", ["WEDDING"]);

export const events = pgTable(
  "events",
  {
    id: id(),
    organizationId: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    eventType: eventType().notNull().default("WEDDING"),
    title: text().notNull(),
    // MVP §5 "coupleNames" as two nullable fields (user decision 2026-10-05), so other
    // event types can leave them empty.
    brideName: text(),
    groomName: text(),
    // MVP §5 "parents": optional free text.
    parents: text(),
    timezone: text().notNull().default("Asia/Tehran"),
    // Tech §8: only archival is stored; active or held state is computed.
    archivedAt: timestamptz(),
    purgeScheduledAt: timestamptz(),
    version: version(),
    ...timestamps,
  },
  (table) => [
    index("events_organization_id_idx").on(table.organizationId),
    check("events_title_not_blank", sql`btrim(${table.title}) <> ''`),
  ],
);
