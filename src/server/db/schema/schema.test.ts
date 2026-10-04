import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { eventMembers, events, organizationMembers } from "@/server/db/schema";

/** Each foreign key as "column → table.column (on delete …)", with TypeScript column keys. */
function foreignKeys(table: PgTable): string[] {
  return getTableConfig(table)
    .foreignKeys.map((fk) => {
      const ref = fk.reference();
      const target = getTableConfig(ref.foreignTable).name;
      return `${ref.columns.map((c) => c.name).join()} → ${target}.${ref.foreignColumns
        .map((c) => c.name)
        .join()} (on delete ${fk.onDelete ?? "no action"})`;
    })
    .sort();
}

// The integration test proves the rules on PostgreSQL; this pins the declared relations.
describe("foundation foreign keys", () => {
  it("events belong to an organization that cannot be deleted while it has events", () => {
    expect(foreignKeys(events)).toEqual(["organizationId → organizations.id (on delete restrict)"]);
  });

  it("memberships disappear with their organization, event or user", () => {
    expect(foreignKeys(organizationMembers)).toEqual([
      "organizationId → organizations.id (on delete cascade)",
      "userId → users.id (on delete cascade)",
    ]);
    expect(foreignKeys(eventMembers)).toEqual([
      "eventId → events.id (on delete cascade)",
      "userId → users.id (on delete cascade)",
    ]);
  });
});
