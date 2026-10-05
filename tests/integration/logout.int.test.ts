import { randomInt } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import type { PhoneE164 } from "@/domain/auth/phone";
import { closeDb, getDb } from "@/server/db/client";
import {
  createSession,
  resolveSession,
  revokeAllSessions,
  revokeSession,
} from "@/server/services/auth";
import { ensureHostAccount } from "@/server/services/org";

afterAll(async () => {
  await closeDb();
});

async function hostWithSessions(count: number) {
  const phone = `+989${randomInt(100_000_000, 999_999_999)}` as PhoneE164;
  const { userId } = await getDb().transaction((tx) => ensureHostAccount(phone, tx));
  const tokens = [];
  for (let i = 0; i < count; i++) tokens.push((await createSession(userId, getDb())).token);
  return { userId, tokens };
}

describe("logout", () => {
  it("ends only this device's session", async () => {
    const { tokens } = await hostWithSessions(2);
    const [here, other] = tokens as [string, string];
    const session = await resolveSession(here);
    if (!session) throw new Error("no session");
    await revokeSession(session.sessionId);
    expect(await resolveSession(here)).toBeNull();
    expect(await resolveSession(other)).not.toBeNull();
  });

  it("ends every session of the host, and no one else's", async () => {
    const { userId, tokens } = await hostWithSessions(3);
    const stranger = await hostWithSessions(1);
    expect(await revokeAllSessions(userId)).toBe(3);
    for (const token of tokens) expect(await resolveSession(token)).toBeNull();
    expect(await resolveSession(stranger.tokens[0] ?? "")).not.toBeNull();
    expect(await revokeAllSessions(userId)).toBe(0);
  });
});
