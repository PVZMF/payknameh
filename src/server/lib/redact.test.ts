import { describe, expect, it } from "vitest";
import { maskPhone, redact } from "@/server/lib/redact";

describe("redact", () => {
  it("removes tokens, OTP codes, names and personal notes", () => {
    const out = redact({
      token: "abc123",
      otpCode: "123456",
      firstName: "Sara",
      displayName: "خانواده‌ی احمدی",
      personalNote: "Dear aunt …",
      householdId: "0190a1b2-0000-7000-8000-000000000000",
    });
    expect(out).toEqual({
      token: "[REDACTED]",
      otpCode: "[REDACTED]",
      firstName: "[REDACTED]",
      displayName: "[REDACTED]",
      personalNote: "[REDACTED]",
      householdId: "0190a1b2-0000-7000-8000-000000000000",
    });
  });

  it("masks phone fields and keeps the last two digits", () => {
    expect(redact({ phoneE164: "+989121234567" })).toEqual({ phoneE164: "••••••••••67" });
  });

  it("masks phone numbers inside free text, in Latin and Persian digits", () => {
    const out = redact({ note: "sent to 09121234567 and ۰۹۳۵۱۲۳۴۵۶۷" }) as { note: string };
    expect(out.note).not.toMatch(/1234567|۱۲۳۴۵۶۷/);
    expect(out.note).toContain("•67");
  });

  it("masks invitation tokens in paths", () => {
    expect(redact({ url: "https://pk.ir/i/Abc123XyZ?x=1" })).toEqual({
      url: "https://pk.ir/i/[REDACTED]?x=1",
    });
  });

  it("redacts nested objects and arrays", () => {
    const out = redact({ req: { headers: { cookie: "s=1" } }, list: [{ name: "x" }] });
    expect(out).toEqual({
      req: { headers: { cookie: "[REDACTED]" } },
      list: [{ name: "[REDACTED]" }],
    });
  });

  it("keeps error type and stack but masks personal data in the message", () => {
    const out = redact({ err: new Error("SMS to 09121234567 failed") }) as {
      err: { type: string; message: string; stack?: string };
    };
    expect(out.err.type).toBe("Error");
    expect(out.err.message).not.toContain("1234567");
    expect(out.err.stack).toBeTypeOf("string");
  });

  it("stops at a fixed depth instead of walking huge or cyclic objects", () => {
    let deep: Record<string, unknown> = { leaf: true };
    for (let i = 0; i < 12; i++) deep = { next: deep };
    expect(JSON.stringify(redact(deep))).toContain("[TRUNCATED]");
  });

  it("masks a short phone field completely", () => {
    expect(redact({ phone: "1" })).toEqual({ phone: "••" });
  });

  it("leaves non-personal values unchanged", () => {
    expect(redact({ count: 3, ok: true, status: "SENT" })).toEqual({
      count: 3,
      ok: true,
      status: "SENT",
    });
  });
});

describe("maskPhone", () => {
  it("never returns more than two digits", () => {
    expect(maskPhone("+98 912 123 4567").replace(/•/g, "")).toBe("67");
  });
});
