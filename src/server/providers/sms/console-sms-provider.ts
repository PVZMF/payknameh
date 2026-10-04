import "server-only";
import { randomUUID } from "node:crypto";
import type { PhoneE164 } from "@/domain/auth/phone";
import { countSmsSegments } from "@/domain/delivery/sms-segments";
import { ok, type Result } from "@/domain/shared/result";
import { getLogger } from "@/server/lib/logger";
import { maskPhone } from "@/server/lib/redact";
import type {
  SmsDeliveryStatus,
  SmsProvider,
  SmsSendError,
  SmsSent,
} from "@/server/providers/sms/sms-provider";
import { AUTH_STRINGS } from "@/strings/auth";

const log = getLogger("auth");

/**
 * MVP §7: prints messages to the terminal so development needs no SMS vendor. The login code
 * goes straight to the terminal, never through the logger (Tech §12: no OTP codes in logs).
 * Allowed only for APP_ENV local and development (enforced in src/env.ts).
 */
export class ConsoleSmsProvider implements SmsProvider {
  readonly name = "console";
  // Idempotency for one process; the console provider is never used across instances.
  private readonly sent = new Map<string, SmsSent>();

  constructor(
    private readonly print: (line: string) => void = (line) => process.stdout.write(`${line}\n`),
  ) {}

  sendOtp(input: {
    to: PhoneE164;
    code: string;
    idempotencyKey: string;
  }): Promise<Result<SmsSent, SmsSendError>> {
    return this.send(input.idempotencyKey, AUTH_STRINGS.otpSms(input.code), () => {
      this.print(`[ConsoleSmsProvider] login code for ${maskPhone(input.to)}: ${input.code}`);
    });
  }

  sendInvitation(input: {
    to: PhoneE164;
    text: string;
    idempotencyKey: string;
  }): Promise<Result<SmsSent, SmsSendError>> {
    return this.send(input.idempotencyKey, input.text, () => {
      this.print(`[ConsoleSmsProvider] invitation for ${maskPhone(input.to)}:\n${input.text}`);
    });
  }

  getStatus(providerMessageId: string): Promise<SmsDeliveryStatus> {
    const known = [...this.sent.values()].some((s) => s.providerMessageId === providerMessageId);
    return Promise.resolve(known ? "DELIVERED" : "UNKNOWN");
  }

  private send(
    idempotencyKey: string,
    text: string,
    print: () => void,
  ): Promise<Result<SmsSent, SmsSendError>> {
    const previous = this.sent.get(idempotencyKey);
    if (previous) return Promise.resolve(ok(previous));
    print();
    const sent = {
      providerMessageId: `console-${randomUUID()}`,
      segments: countSmsSegments(text).segments,
    };
    this.sent.set(idempotencyKey, sent);
    log.info(
      { provider: this.name, messageId: sent.providerMessageId, segments: sent.segments },
      "sms sent",
    );
    return Promise.resolve(ok(sent));
  }
}
