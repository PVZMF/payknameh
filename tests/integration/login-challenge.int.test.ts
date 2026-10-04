import { randomInt } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import type { PhoneE164 } from "@/domain/auth/phone";
import { closeDb, getDb } from "@/server/db/client";
import { otpChallenges } from "@/server/db/schema";
import { uuidv7 } from "@/server/db/uuidv7";
import { describeChallenge, resendOtp } from "@/server/services/auth";

afterAll(async () => {
  await closeDb();
});

async function challenge(createdSecondsAgo = 0) {
  const id = uuidv7();
  const phone = `+989${randomInt(100_000_000, 999_999_999)}` as PhoneE164;
  await getDb()
    .insert(otpChallenges)
    .values({
      id,
      phoneE164: phone,
      codeHash: "x",
      expiresAt: sql`now() + interval '2 minutes'`,
      createdAt: sql`now() - make_interval(secs => ${createdSecondsAgo})`,
    });
  return { id, phone };
}

describe("describeChallenge", () => {
  it("returns the number and the seconds until a resend is allowed", async () => {
    const { id, phone } = await challenge(15);
    const described = await describeChallenge(id);
    expect(described?.phone).toBe(phone);
    expect(described?.resendInSeconds).toBeGreaterThanOrEqual(44);
    expect(described?.resendInSeconds).toBeLessThanOrEqual(45);
    expect((await describeChallenge((await challenge(90)).id))?.resendInSeconds).toBe(0);
  });

  it("returns null for unknown, malformed or used challenges", async () => {
    const used = await challenge();
    await getDb()
      .update(otpChallenges)
      .set({ consumedAt: sql`now()` })
      .where(eq(otpChallenges.id, used.id));
    expect(await describeChallenge(used.id)).toBeNull();
    expect(await describeChallenge(uuidv7())).toBeNull();
    expect(await describeChallenge("nope")).toBeNull();
  });
});

describe("resendOtp", () => {
  it("refuses an unknown challenge", async () => {
    expect(await resendOtp({ challengeId: uuidv7(), ip: "192.0.2.1" })).toEqual({
      ok: false,
      code: "OTP_INVALID",
    });
  });

  it("goes through the normal request limits for the challenge's number", async () => {
    const { id } = await challenge();
    const first = await resendOtp({ challengeId: id, ip: `198.18.${randomInt(0, 255)}.1` });
    expect(first.ok).toBe(true);
    const second = await resendOtp({ challengeId: id, ip: `198.18.${randomInt(0, 255)}.2` });
    expect(second).toMatchObject({ ok: false, code: "OTP_RATE_LIMITED" });
  });
});
