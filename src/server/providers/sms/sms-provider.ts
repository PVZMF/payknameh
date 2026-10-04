import "server-only";
import type { PhoneE164 } from "@/domain/auth/phone";
import type { Result } from "@/domain/shared/result";

// MVP §7 / Tech §7.8: one interface for OTP and invitation SMS. Vendor-specific logic stays
// in its adapter; services only see this interface.

export type SmsSendError = "SMS_SEND_FAILED";

export type SmsDeliveryStatus = "SENT" | "DELIVERED" | "FAILED" | "UNKNOWN";

export interface SmsSent {
  providerMessageId: string;
  /** Tech §7.8: recorded per send; the basis of the SMS margin metric. */
  segments: number;
}

export interface SmsProvider {
  readonly name: string;
  /**
   * Sends a login code, through the vendor's verify/template service where it has one.
   * Retrying with the same idempotency key never sends a second SMS.
   */
  sendOtp(input: {
    to: PhoneE164;
    code: string;
    idempotencyKey: string;
  }): Promise<Result<SmsSent, SmsSendError>>;
  /** Sends an invitation text. Same idempotency rule as sendOtp. */
  sendInvitation(input: {
    to: PhoneE164;
    text: string;
    idempotencyKey: string;
  }): Promise<Result<SmsSent, SmsSendError>>;
  /** Current delivery state of a sent message. */
  getStatus(providerMessageId: string): Promise<SmsDeliveryStatus>;
}
