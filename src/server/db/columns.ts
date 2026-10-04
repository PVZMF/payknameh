import { timestamp, uuid } from "drizzle-orm/pg-core";
import { uuidv7 } from "@/server/db/uuidv7";

// Tech §7.2 conventions shared by every table. Tables are snake_case plural; the client
// and drizzle-kit both use `casing: "snake_case"`, so camelCase keys map to snake_case columns.

/** UUIDv7 primary key, generated in app code. */
export const id = () =>
  uuid()
    .primaryKey()
    .$defaultFn(() => uuidv7());

/** All times are timestamptz. */
export const timestamptz = (name?: string) =>
  name ? timestamp(name, { withTimezone: true }) : timestamp({ withTimezone: true });

/** createdAt / updatedAt pair for mutable tables. */
export const timestamps = {
  createdAt: timestamptz().notNull().defaultNow(),
  updatedAt: timestamptz()
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
};
