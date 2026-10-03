import { defineConfig } from "drizzle-kit";

// drizzle-kit runs as a CLI outside the app, so it reads the migrator URL directly.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./src/server/db/migrations",
  casing: "snake_case",
  dbCredentials: { url: process.env.DB_MIGRATE_URL ?? "" },
  strict: true,
  verbose: true,
});
