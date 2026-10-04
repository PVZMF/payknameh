import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

export const MIGRATIONS_FOLDER = "src/server/db/migrations";

/**
 * Applies pending migrations with the migrator user (Standards §7, Tech §13.3: a separate
 * step before the app starts). Forward-only; never rolls back.
 */
export async function runMigrations(migrateUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: migrateUrl, max: 1 });
  try {
    await migrate(drizzle({ client: pool }), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await pool.end();
  }
}
