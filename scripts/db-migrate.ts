import { migrationEnvSchema, parseEnv } from "@/env";
import { runMigrations } from "@/server/db/migrate";

const { DB_MIGRATE_URL } = parseEnv(migrationEnvSchema, process.env);
await runMigrations(DB_MIGRATE_URL);
console.log("Migrations applied.");
