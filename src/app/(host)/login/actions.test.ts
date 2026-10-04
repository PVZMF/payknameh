import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((path: string) => {
  throw new Error(`redirect:${path}`);
});
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ "x-forwarded-for": "203.0.113.9" })),
}));
vi.mock("@/env", () => ({ getEnv: () => ({ TRUSTED_PROXY_HOPS: 0 }) }));
const setSessionCookie = vi.fn();
vi.mock("@/app/_lib/auth", () => ({ setSessionCookie }));
const services = { requestOtp: vi.fn(), verifyOtp: vi.fn(), resendOtp: vi.fn() };
vi.mock("@/server/services/auth", () => services);

const { requestOtpAction, resendOtpAction, verifyOtpAction } =
  await import("@/app/(host)/login/actions");

const CHALLENGE = "0190e3a0-0000-7000-8000-000000000001";
function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("login actions", () => {
  it("requests a code with the client IP and moves to the code page", async () => {
    services.requestOtp.mockResolvedValue({ ok: true, value: { challengeId: CHALLENGE } });
    await expect(requestOtpAction(undefined, form({ phone: "09121234567" }))).rejects.toThrow(
      `redirect:/login/verify?c=${CHALLENGE}`,
    );
    expect(services.requestOtp).toHaveBeenCalledWith({ phone: "09121234567", ip: "203.0.113.9" });
  });

  it("shows a Persian error instead of moving on", async () => {
    services.requestOtp.mockResolvedValue({ ok: false, code: "PHONE_INVALID" });
    expect(await requestOtpAction(undefined, form({ phone: "1" }))).toEqual({
      error: expect.stringContaining("شماره"),
    });
    expect(await requestOtpAction(undefined, new FormData())).toEqual({
      error: expect.any(String),
    });
  });

  it("sets the session cookie only after a correct code", async () => {
    const expires = new Date();
    services.verifyOtp.mockResolvedValueOnce({ ok: false, code: "OTP_INVALID" });
    expect(
      await verifyOtpAction(undefined, form({ challengeId: CHALLENGE, code: "000000" })),
    ).toEqual({
      error: expect.any(String),
    });
    expect(setSessionCookie).not.toHaveBeenCalled();

    services.verifyOtp.mockResolvedValueOnce({
      ok: true,
      value: { sessionToken: "t", sessionExpiresAt: expires },
    });
    await expect(
      verifyOtpAction(undefined, form({ challengeId: CHALLENGE, code: "123456" })),
    ).rejects.toThrow("redirect:/events");
    expect(setSessionCookie).toHaveBeenCalledWith("t", expires);
    expect(await verifyOtpAction(undefined, form({ challengeId: "bad", code: "1" }))).toEqual({
      error: expect.any(String),
    });
  });

  it("resends for a valid challenge and starts over for a broken one", async () => {
    services.resendOtp.mockResolvedValueOnce({ ok: true, value: { challengeId: CHALLENGE } });
    await expect(resendOtpAction(undefined, form({ challengeId: CHALLENGE }))).rejects.toThrow(
      `redirect:/login/verify?c=${CHALLENGE}`,
    );
    services.resendOtp.mockResolvedValueOnce({
      ok: false,
      code: "OTP_RATE_LIMITED",
      retryAfterSeconds: 9,
    });
    expect(await resendOtpAction(undefined, form({ challengeId: CHALLENGE }))).toEqual({
      error: expect.stringContaining("۹"),
    });
    await expect(resendOtpAction(undefined, form({ challengeId: "bad" }))).rejects.toThrow(
      "redirect:/login",
    );
  });
});
