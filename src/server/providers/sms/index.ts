import "server-only";
import { getEnv, type Env } from "@/env";
import { ConsoleSmsProvider } from "@/server/providers/sms/console-sms-provider";
import type { SmsProvider } from "@/server/providers/sms/sms-provider";

export type {
  SmsDeliveryStatus,
  SmsProvider,
  SmsSendError,
  SmsSent,
} from "@/server/providers/sms/sms-provider";

/** Builds the provider named by SMS_PROVIDER. The vendor adapter arrives with PK-036 (D-06). */
export function createSmsProvider(name: Env["SMS_PROVIDER"]): SmsProvider {
  switch (name) {
    case "console":
      return new ConsoleSmsProvider();
  }
}

let provider: SmsProvider | undefined;

/** The process-wide SMS provider. */
export function getSmsProvider(): SmsProvider {
  provider ??= createSmsProvider(getEnv().SMS_PROVIDER);
  return provider;
}
