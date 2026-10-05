import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { PhoneE164 } from "@/domain/auth/phone";

const info = vi.fn();
vi.mock("@/server/lib/logger", () => ({ getLogger: () => ({ info }) }));
vi.mock("@/env", () => ({ getEnv: () => ({ SMS_PROVIDER: "console" }) }));

const { ConsoleSmsProvider } = await import("@/server/providers/sms/console-sms-provider");
const { createSmsProvider, getSmsProvider } = await import("@/server/providers/sms");

const TO = "+989121234567" as PhoneE164;

function provider() {
  const lines: string[] = [];
  return { lines, sms: new ConsoleSmsProvider((line) => lines.push(line)) };
}

describe("ConsoleSmsProvider", () => {
  it("prints the login code with a masked number and logs the send without the code", async () => {
    const { lines, sms } = provider();
    const result = await sms.sendOtp({ to: TO, code: "482915", idempotencyKey: "otp-1" });
    expect(result).toEqual({
      ok: true,
      value: { providerMessageId: expect.stringMatching(/^console-/), segments: 1 },
    });
    expect(lines).toEqual(["[ConsoleSmsProvider] login code for ••••••••••67: 482915"]);
    expect(JSON.stringify(info.mock.calls)).not.toMatch(/482915|1234567/);
    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "console", segments: 1 }),
      "sms sent",
    );
  });

  it("never sends twice for the same idempotency key", async () => {
    const { lines, sms } = provider();
    const first = await sms.sendOtp({ to: TO, code: "111111", idempotencyKey: "same" });
    const second = await sms.sendOtp({ to: TO, code: "111111", idempotencyKey: "same" });
    expect(second).toEqual(first);
    expect(lines).toHaveLength(1);
  });

  it("prints an invitation and counts its segments", async () => {
    const { lines, sms } = provider();
    const text = "س".repeat(71);
    const result = await sms.sendInvitation({ to: TO, text, idempotencyKey: "inv-1" });
    expect(result.ok && result.value.segments).toBe(2);
    expect(lines[0]).toContain(text);
  });

  it("reports delivered for its own messages and unknown otherwise", async () => {
    const { sms } = provider();
    const result = await sms.sendOtp({ to: TO, code: "222222", idempotencyKey: "otp-2" });
    if (!result.ok) throw new Error("send failed");
    expect(await sms.getStatus(result.value.providerMessageId)).toBe("DELIVERED");
    expect(await sms.getStatus("console-other")).toBe("UNKNOWN");
  });

  it("appends every message to the test outbox when one is set", async () => {
    const outbox = join(mkdtempSync(join(tmpdir(), "pk-sms-")), "outbox.jsonl");
    const sms = new ConsoleSmsProvider(() => undefined, outbox);
    await sms.sendOtp({ to: TO, code: "555555", idempotencyKey: "o-1" });
    await sms.sendInvitation({ to: TO, text: "سلام", idempotencyKey: "o-2" });
    const lines = readFileSync(outbox, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as unknown);
    expect(lines).toEqual([
      { kind: "otp", to: TO, code: "555555" },
      { kind: "invitation", to: TO, text: "سلام" },
    ]);
  });

  it("writes to stdout by default", async () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    await new ConsoleSmsProvider().sendOtp({ to: TO, code: "333333", idempotencyKey: "otp-3" });
    expect(write).toHaveBeenCalledWith(expect.stringContaining("333333"));
    write.mockRestore();
  });
});

describe("SMS provider factory", () => {
  it("builds the console provider and reuses one instance per process", () => {
    expect(createSmsProvider("console").name).toBe("console");
    expect(getSmsProvider()).toBe(getSmsProvider());
  });
});
