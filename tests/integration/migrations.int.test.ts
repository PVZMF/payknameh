import { Client } from "pg";
import { describe, expect, it } from "vitest";
import { runMigrations } from "@/server/db/migrate";

// Global setup already applied every migration to the empty test database (Standards §7);
// running them again must be a no-op, because deploys run migrate on every release.
describe("runMigrations", () => {
  it("is idempotent on an up-to-date database", async () => {
    const migrateUrl = process.env.DB_MIGRATE_URL ?? "";
    const count = async () => {
      const client = new Client({ connectionString: migrateUrl });
      await client.connect();
      const { rows } = await client.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations",
      );
      await client.end();
      return rows[0]?.n;
    };

    const before = await count();
    await runMigrations(migrateUrl);
    expect(await count()).toBe(before);
  });
});
