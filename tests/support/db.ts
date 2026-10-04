import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const ROLLBACK = Symbol("rollback");

let pool: Pool | undefined;

/** Pool on the test database as the app user, like the running app. */
export function getTestPool(): Pool {
  pool ??= new Pool({ connectionString: process.env.DB_URL, max: 4 });
  return pool;
}

export async function closeTestPool(): Promise<void> {
  await pool?.end();
  pool = undefined;
}

/**
 * Runs fn inside a transaction that is always rolled back, so each test leaves the
 * database exactly as it found it.
 */
export async function inRollbackTransaction<T>(fn: (db: NodePgDatabase) => Promise<T>): Promise<T> {
  const client = await getTestPool().connect();
  let result: T | undefined;
  try {
    await client.query("BEGIN");
    result = await fn(drizzle({ client, casing: "snake_case" }));
    throw ROLLBACK;
  } catch (error) {
    if (error !== ROLLBACK) throw error;
    return result as T;
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
}
