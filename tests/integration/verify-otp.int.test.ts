import { randomInt } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { PhoneE164 } from "@/domain/auth/phone";
import { ok } from "@/domain/shared/result";
import { closeDb, getDb } from "@/server/db/client";
import {
  authSessions,
  organizationMembers,
  organizations,
  otpChallenges,
  users,
} from "@/server/db/schema";
import { uuidv7 } from "@/server/db/uuidv7";
import type { SmsProvider } from "@/server/providers/sms";
import { hashSessionToken, requestOtp, verifyOtp } from "@/server/services/auth";
import { hashOtp } from "@/server/services/auth/otp-hash";

afterAll(async () => {
  await closeDb();
});

function freshPhone(): PhoneE164 {
  return `+989${randomInt(100_000_000, 999_999_999)}` as PhoneE164;
}

/** A challenge written directly, skipping the request limits; expired when ttl <= 0. */
async function makeChallenge(phone: PhoneE164, code = "123456", ttlSeconds = 120) {
  const id = uuidv7();
  await getDb()
    .insert(otpChallenges)
    .values({
      id,
      phoneE164: phone,
      codeHash: hashOtp(id, code),
      expiresAt: sql`now() + make_interval(secs => ${ttlSeconds})`,
    });
  return id;
}

describe("verifyOtp", () => {
  it("signs up a new host: user, personal organization, OWNER membership and a session", async () => {
    const phone = freshPhone();
    const challengeId = await makeChallenge(phone);
    const result = await verifyOtp({ challengeId, code: "123456" });
    if (!result.ok) throw new Error(`expected ok, got ${result.code}`);
    expect(result.value.isNewUser).toBe(true);
    expect(result.value.sessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.phoneE164, phone));
    expect(user?.id).toBe(result.value.userId);
    const memberships = await db
      .select({ role: organizationMembers.role, type: organizations.type })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .where(eq(organizationMembers.userId, result.value.userId));
    expect(memberships).toEqual([{ role: "OWNER", type: "PERSONAL" }]);

    const [session] = await db
      .select()
      .from(authSessions)
      .where(eq(authSessions.tokenHash, hashSessionToken(result.value.sessionToken)));
    expect(session?.userId).toBe(result.value.userId);
    const days = ((session?.expiresAt.getTime() ?? 0) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThanOrEqual(30);

    const [challenge] = await db
      .select()
      .from(otpChallenges)
      .where(eq(otpChallenges.id, challengeId));
    expect(challenge?.consumedAt).toBeInstanceOf(Date);
  });

  it("logs an existing host back in without a second organization", async () => {
    const phone = freshPhone();
    const first = await verifyOtp({ challengeId: await makeChallenge(phone), code: "123456" });
    const second = await verifyOtp({ challengeId: await makeChallenge(phone), code: "123456" });
    if (!first.ok || !second.ok) throw new Error("expected both to sign in");
    expect(second.value).toMatchObject({ isNewUser: false, userId: first.value.userId });
    expect(second.value.sessionToken).not.toBe(first.value.sessionToken);
    const memberships = await getDb()
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, first.value.userId));
    expect(memberships).toHaveLength(1);
  });

  it("accepts the code typed in Persian digits", async () => {
    const challengeId = await makeChallenge(freshPhone(), "123456");
    expect((await verifyOtp({ challengeId, code: "۱۲۳۴۵۶" })).ok).toBe(true);
  });

  it("refuses a wrong code and stops after 5 attempts, even for the right code", async () => {
    const challengeId = await makeChallenge(freshPhone());
    for (let i = 0; i < 5; i++) {
      expect(await verifyOtp({ challengeId, code: "000000" })).toEqual({
        ok: false,
        code: "OTP_INVALID",
      });
    }
    expect(await verifyOtp({ challengeId, code: "123456" })).toEqual({
      ok: false,
      code: "OTP_ATTEMPTS_EXCEEDED",
    });
  });

  it("is single use: the same code cannot sign in twice", async () => {
    const challengeId = await makeChallenge(freshPhone());
    expect((await verifyOtp({ challengeId, code: "123456" })).ok).toBe(true);
    expect(await verifyOtp({ challengeId, code: "123456" })).toEqual({
      ok: false,
      code: "OTP_INVALID",
    });
  });

  it("lets only one of two parallel correct verifications through", async () => {
    const challengeId = await makeChallenge(freshPhone());
    const results = await Promise.all([
      verifyOtp({ challengeId, code: "123456" }),
      verifyOtp({ challengeId, code: "123456" }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("refuses an expired code", async () => {
    const challengeId = await makeChallenge(freshPhone(), "123456", -1);
    expect(await verifyOtp({ challengeId, code: "123456" })).toEqual({
      ok: false,
      code: "OTP_EXPIRED",
    });
  });

  it("refuses unknown or malformed challenges and codes alike", async () => {
    for (const input of [
      { challengeId: uuidv7(), code: "123456" },
      { challengeId: "not-a-uuid", code: "123456" },
      { challengeId: uuidv7(), code: "12345" },
    ]) {
      expect(await verifyOtp(input)).toEqual({ ok: false, code: "OTP_INVALID" });
    }
  });

  it("limits verify attempts per phone across challenges", async () => {
    const phone = freshPhone();
    for (let c = 0; c < 3; c++) {
      const challengeId = await makeChallenge(phone);
      for (let i = 0; i < 5; i++) await verifyOtp({ challengeId, code: "000000" });
    }
    const result = await verifyOtp({ challengeId: await makeChallenge(phone), code: "123456" });
    expect(result).toMatchObject({ ok: false, code: "OTP_RATE_LIMITED" });
  });

  it("works end to end with requestOtp", async () => {
    let code = "";
    const sms = {
      name: "fake",
      sendOtp: vi.fn((input: { code: string; idempotencyKey: string }) => {
        code = input.code;
        return Promise.resolve(ok({ providerMessageId: input.idempotencyKey, segments: 1 }));
      }),
    } as unknown as SmsProvider;
    const requested = await requestOtp(
      { phone: `0${freshPhone().slice(3)}`, ip: "192.0.2.10" },
      { sms },
    );
    if (!requested.ok) throw new Error(`request failed: ${requested.code}`);
    expect((await verifyOtp({ challengeId: requested.value.challengeId, code })).ok).toBe(true);
  });
});
