import { describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({ getEnv: () => ({ AUTH_OTP_SECRET: "x".repeat(32) }) }));
const { hashOtp, otpMatches } = await import("@/server/services/auth/otp-hash");

describe("OTP hashing", () => {
  it("never contains the code and differs per challenge", () => {
    const hash = hashOtp("challenge-a", "123456");
    expect(hash).not.toContain("123456");
    expect(hash).toBe(hashOtp("challenge-a", "123456"));
    expect(hash).not.toBe(hashOtp("challenge-b", "123456"));
  });

  it("matches only the right code for the right challenge", () => {
    const hash = hashOtp("challenge-a", "123456");
    expect(otpMatches(hash, "challenge-a", "123456")).toBe(true);
    expect(otpMatches(hash, "challenge-a", "654321")).toBe(false);
    expect(otpMatches(hash, "challenge-b", "123456")).toBe(false);
    expect(otpMatches("short", "challenge-a", "123456")).toBe(false);
  });
});
