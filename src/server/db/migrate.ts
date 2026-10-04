import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { setupQueues } from "@/server/db/queue-setup";

export const MIGRATIONS_FOLDER = "src/server/db/migrations";

/**
 * Applies pending migrations and the queue schema with the migrator user (Standards §7, Tech §13.3: a separate
 * step before the app starts). Forward-only; never rolls back.
 */
export async function runMigrations(migrateUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: migrateUrl, max: 1 });
  try {
    await migrate(drizzle({ client: pool }), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await pool.end();
  }
  await setupQueues(migrateUrl);
}
