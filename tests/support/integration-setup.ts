import { existsSync } from "node:fs";
import { Client } from "pg";
import { runMigrations } from "@/server/db/migrate";

/**
 * Runs once before the integration suite: wipes the test database as the migrator and
 * applies every migration to the empty schema (Standards §7: migrations are tested on an
 * empty database).
 */
export default async function setup(): Promise<void> {
  // Global setup runs in the main process, outside the project's `env`; real variables win.
  if (existsSync(".env")) process.loadEnvFile(".env");
  const migrateUrl = process.env.DB_TEST_MIGRATE_URL;
  const appUrl = process.env.DB_TEST_URL;
  if (!migrateUrl || !appUrl) {
    throw new Error("DB_TEST_URL and DB_TEST_MIGRATE_URL must be set (see .env.example)");
  }
  const appUser = decodeURIComponent(new URL(appUrl).username);

  const client = new Client({ connectionString: migrateUrl });
  await client.connect();
  try {
    await client.query(`
      DROP SCHEMA IF EXISTS drizzle CASCADE;
      DROP SCHEMA IF EXISTS pgboss CASCADE;
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      REVOKE CREATE ON SCHEMA public FROM PUBLIC;
      GRANT USAGE ON SCHEMA public TO "${appUser}";
    `);
  } finally {
    await client.end();
  }

  await runMigrations(migrateUrl);
}
