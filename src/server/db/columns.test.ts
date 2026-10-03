import { getTableConfig, pgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { id, timestamps, timestamptz } from "@/server/db/columns";

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const probes = pgTable("probes", {
  id: id(),
  openedAt: timestamptz(),
  closedAt: timestamptz("closed_on"),
  ...timestamps,
});

describe("shared columns (Tech §7.2)", () => {
  it("makes id a uuid primary key filled with UUIDv7 in app code", () => {
    expect(probes.id.getSQLType()).toBe("uuid");
    expect(probes.id.primary).toBe(true);
    expect(probes.id.defaultFn?.()).toMatch(UUID_V7);
  });

  it("stores every time as timestamptz", () => {
    for (const column of getTableConfig(probes).columns.filter((c) => c.name !== "id")) {
      expect(column.getSQLType()).toBe("timestamp with time zone");
    }
  });

  it("keeps an explicit column name when one is given", () => {
    expect(probes.closedAt.name).toBe("closed_on");
  });

  it("defaults createdAt and updatedAt to now and refreshes updatedAt on update", () => {
    expect(probes.createdAt.hasDefault).toBe(true);
    expect(probes.createdAt.notNull).toBe(true);
    expect(probes.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
  });
});
