import { index, pgEnum, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { timestamptz } from "@/server/db/columns";
import { events } from "@/server/db/schema/event";
import { users } from "@/server/db/schema/org";

// Module org (Standards §1: EventMember and access). MVP §5: roles OWNER and EDITOR; the model
// and access checks exist in the MVP, the invite UI does not.

export const eventMemberRole = pgEnum("event_member_role", ["OWNER", "EDITOR"]);

export const eventMembers = pgTable(
  "event_members",
  {
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: eventMemberRole().notNull(),
    createdAt: timestamptz().notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.userId] }),
    index("event_members_user_id_idx").on(table.userId),
  ],
);
