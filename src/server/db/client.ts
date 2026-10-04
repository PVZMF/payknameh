import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getEnv } from "@/env";
import * as schema from "@/server/db/schema";

export type Database = NodePgDatabase<typeof schema>;

let pool: Pool | undefined;
let db: Database | undefined;

/** Shared pool for the app user (no DDL rights, Standards §7). Created on first use. */
export function getPool(): Pool {
  pool ??= new Pool({ connectionString: getEnv().DB_URL, max: 10 });
  return pool;
}

/** Drizzle client on the shared pool. */
export function getDb(): Database {
  db ??= drizzle({ client: getPool(), schema, casing: "snake_case" });
  return db;
}

/** Closes the pool; used on worker shutdown and in tests. */
export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = undefined;
  db = undefined;
}
