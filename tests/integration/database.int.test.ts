import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { Client } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { MIGRATIONS_FOLDER } from "@/server/db/migrate";
import { closeTestPool, getTestPool, inRollbackTransaction } from "../support/db";

afterAll(closeTestPool);

describe("test database", () => {
  it("has every migration applied to the empty schema", async () => {
    const journal = JSON.parse(readFileSync(`${MIGRATIONS_FOLDER}/meta/_journal.json`, "utf8")) as {
      entries: unknown[];
    };
    const client = new Client({ connectionString: process.env.DB_MIGRATE_URL });
    await client.connect();
    const { rows } = await client.query(
      "SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations",
    );
    await client.end();
    expect(rows[0]?.n).toBe(journal.entries.length);
  });

  it("runs in UTC (baseline migration)", async () => {
    const { rows } = await getTestPool().query("SHOW timezone");
    expect(rows[0]?.TimeZone).toBe("UTC");
  });

  it("does not let the app user run DDL (Standards §7)", async () => {
    await expect(getTestPool().query("CREATE TABLE app_must_not(id int)")).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe("inRollbackTransaction", () => {
  it("rolls back everything a test did", async () => {
    const seen = await inRollbackTransaction(async (db) => {
      await db.execute(sql`CREATE TEMP TABLE probe(id int)`);
      await db.execute(sql`INSERT INTO probe VALUES (1)`);
      const { rows } = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM probe`);
      return rows[0]?.n;
    });
    expect(seen).toBe(1);

    const { rows } = await getTestPool().query("SELECT to_regclass('pg_temp.probe') AS t");
    expect(rows[0]?.t).toBeNull();
  });
});
