import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { PhoneE164 } from "@/domain/auth/phone";
import { err, ok } from "@/domain/shared/result";
import { closeDb, getDb } from "@/server/db/client";
import { otpChallenges } from "@/server/db/schema";
import type { SmsProvider } from "@/server/providers/sms";
import { requestOtp } from "@/server/services/auth";
import { otpMatches } from "@/server/services/auth/otp-hash";

afterAll(async () => {
  await closeDb();
});

/** A fresh number and IP per test, so rate-limit counters never leak between tests. */
function freshPhone(): string {
  return `09${randomInt(100_000_000, 999_999_999)}`;
}
function freshIp(): string {
  return `198.51.${randomInt(0, 255)}.${randomInt(1, 254)}`;
}

function fakeSms(sendOk = true) {
  const sendOtp = vi.fn((input: { to: PhoneE164; code: string; idempotencyKey: string }) =>
    Promise.resolve(
      sendOk
        ? ok({ providerMessageId: `fake-${input.idempotencyKey}`, segments: 1 })
        : err("SMS_SEND_FAILED" as const),
    ),
  );
  const sms = {
    name: "fake",
    sendOtp,
    sendInvitation: vi.fn(),
    getStatus: vi.fn(),
  } as unknown as SmsProvider;
  return { sms, sendOtp };
}

describe("requestOtp", () => {
  it("rejects an invalid number without sending anything", async () => {
    const { sms, sendOtp } = fakeSms();
    expect(await requestOtp({ phone: "123", ip: freshIp() }, { sms })).toEqual({
      ok: false,
      code: "PHONE_INVALID",
    });
    expect(sendOtp).not.toHaveBeenCalled();
  });

  it("stores only an HMAC of a 6-digit code valid for 2 minutes and sends it once", async () => {
    const { sms, sendOtp } = fakeSms();
    const phone = freshPhone();
    const result = await requestOtp({ phone, ip: freshIp() }, { sms });
    if (!result.ok) throw new Error(`expected ok, got ${result.code}`);
    expect(result.value.resendAfterSeconds).toBe(60);

    const sent = sendOtp.mock.calls[0]?.[0];
    expect(sent).toMatchObject({
      to: `+98${phone.slice(1)}`,
      idempotencyKey: result.value.challengeId,
    });
    expect(sent?.code).toMatch(/^\d{6}$/);

    const [row] = await getDb()
      .select()
      .from(otpChallenges)
      .where(eq(otpChallenges.id, result.value.challengeId));
    expect(row).toMatchObject({ phoneE164: `+98${phone.slice(1)}`, attempts: 0, consumedAt: null });
    expect(row?.codeHash).not.toContain(sent?.code ?? "");
    expect(otpMatches(row?.codeHash ?? "", result.value.challengeId, sent?.code ?? "")).toBe(true);
    const ttl = ((row?.expiresAt.getTime() ?? 0) - (row?.createdAt.getTime() ?? 0)) / 1000;
    expect(ttl).toBeCloseTo(120, 0);
  });

  it("holds a second request for the same number for the resend cooldown", async () => {
    const { sms } = fakeSms();
    const phone = freshPhone();
    expect((await requestOtp({ phone, ip: freshIp() }, { sms })).ok).toBe(true);
    const again = await requestOtp({ phone, ip: freshIp() }, { sms });
    expect(again).toMatchObject({ ok: false, code: "OTP_RATE_LIMITED" });
    if (!again.ok && again.code === "OTP_RATE_LIMITED") {
      expect(again.retryAfterSeconds).toBeGreaterThan(0);
      expect(again.retryAfterSeconds).toBeLessThanOrEqual(60);
    }
  });

  it("limits one IP to 20 requests an hour across different numbers", async () => {
    const { sms, sendOtp } = fakeSms();
    const ip = freshIp();
    for (let i = 0; i < 20; i++) {
      expect((await requestOtp({ phone: freshPhone(), ip }, { sms })).ok).toBe(true);
    }
    expect(await requestOtp({ phone: freshPhone(), ip }, { sms })).toMatchObject({
      ok: false,
      code: "OTP_RATE_LIMITED",
    });
    expect(sendOtp).toHaveBeenCalledTimes(20);
  });

  it("reports a failed send", async () => {
    const { sms } = fakeSms(false);
    expect(await requestOtp({ phone: freshPhone(), ip: freshIp() }, { sms })).toEqual({
      ok: false,
      code: "SMS_SEND_FAILED",
    });
  });

  it("uses the configured SMS provider by default", async () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const result = await requestOtp({ phone: freshPhone(), ip: null });
    expect(result.ok).toBe(true);
    expect(write).toHaveBeenCalledWith(expect.stringMatching(/login code for .*: \d{6}/));
    write.mockRestore();
  });
});
