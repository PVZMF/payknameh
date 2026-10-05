// `pnpm db:seed` (Standards §3): sample data for local, development and staging; never for
// production, which only ever holds real data.
import { getEnv } from "@/env";
import { closeDb } from "@/server/db/client";
import { seedDatabase } from "./seed/seed-database";

if (getEnv().APP_ENV === "production") {
  console.error("Refusing to seed production: it only holds real data (Standards §3).");
  process.exit(1);
}

const result = await seedDatabase();
console.log(
  result.created
    ? `Seeded host ${result.userId} with event ${result.eventId}. Log in locally with 09000000001.`
    : "Seed data already present; nothing changed.",
);
await closeDb();
