import { sql } from "drizzle-orm";
import { check, index, pgEnum, pgTable, primaryKey, text, unique, uuid } from "drizzle-orm/pg-core";
import { id, timestamps, timestamptz } from "@/server/db/columns";

// Module org (Standards §1): User, Organization and membership. MVP §5, Tech §8, Business §9.1.

/** Business §9.1: personal (signup) or professional (planners, later). */
export const organizationType = pgEnum("organization_type", ["PERSONAL", "PROFESSIONAL"]);

/** Tech §8: access to the internal team panel. */
export const staffRole = pgEnum("staff_role", ["NONE", "SUPPORT", "ADMIN"]);

/** Role inside an organization; the personal organization has its user as OWNER. */
export const organizationMemberRole = pgEnum("organization_member_role", ["OWNER"]);

export const organizations = pgTable("organizations", {
  id: id(),
  name: text().notNull(),
  type: organizationType().notNull().default("PERSONAL"),
  ...timestamps,
});

export const users = pgTable(
  "users",
  {
    id: id(),
    // MVP §3.1 / Tech §7.3: normalized to E.164 in the domain layer; unique (Tech §7.2).
    // Named explicitly: snake_case would turn "E164" into "e_164".
    phoneE164: text("phone_e164").notNull(),
    staffRole: staffRole().notNull().default("NONE"),
    ...timestamps,
  },
  (table) => [
    unique("users_phone_e164_unique").on(table.phoneE164),
    check("users_phone_e164_format", sql`${table.phoneE164} ~ '^\\+[1-9][0-9]{7,14}$'`),
  ],
);

/** Tech §8 AuditLog: who acted. GUEST acts through a household token. */
export const auditActorType = pgEnum("audit_actor_type", ["HOST", "GUEST", "STAFF", "SYSTEM"]);

/**
 * Tech §8, §11; Business §7: append-only record of sensitive actions. Rows hold IDs only, no
 * names or phone numbers. A trigger (migration 0003) rejects UPDATE, DELETE and TRUNCATE.
 * event_id has no foreign key on purpose: deleting an event must neither rewrite nor block
 * its audit rows.
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    actorType: auditActorType().notNull(),
    actorId: uuid(),
    /** module.verb-in-past, e.g. guest.token-rotated (same shape as job names). */
    action: text().notNull(),
    entityType: text().notNull(),
    entityId: uuid(),
    eventId: uuid(),
    reason: text(),
    createdAt: timestamptz().notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_event_id_created_at_idx").on(table.eventId, table.createdAt),
    check("audit_logs_action_format", sql`${table.action} ~ '^[a-z]+\\.[a-z][a-z-]*$'`),
    // Tech §11: team members reach event details only with a recorded reason.
    check(
      "audit_logs_staff_reason",
      sql`${table.actorType} <> 'STAFF' OR btrim(coalesce(${table.reason}, '')) <> ''`,
    ),
  ],
);

/** Who belongs to which organization (user decision 2026-10-05, ready for B2B teams). */
export const organizationMembers = pgTable(
  "organization_members",
  {
    organizationId: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: organizationMemberRole().notNull(),
    createdAt: timestamptz().notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    index("organization_members_user_id_idx").on(table.userId),
  ],
);
