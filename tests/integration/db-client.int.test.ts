import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, getDb, getPool } from "@/server/db/client";

afterAll(closeDb);

describe("db client", () => {
  it("connects as the least-privilege app user (Tech §12)", async () => {
    const { rows } = await getDb().execute<{ who: string }>(sql`SELECT current_user AS who`);
    expect(rows[0]?.who).toBe(new URL(process.env.DB_URL ?? "").username);
  });

  it("reuses one pool and opens a fresh one after closeDb", async () => {
    const first = getPool();
    expect(getPool()).toBe(first);

    await closeDb();
    const second = getPool();
    expect(second).not.toBe(first);
    expect((await second.query("SELECT 1 AS ok")).rows[0]?.ok).toBe(1);
  });
});
