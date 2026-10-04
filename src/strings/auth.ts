// Standards §2: Persian text for the auth module. Error codes map to messages here.
export const AUTH_STRINGS = {
  /** Login code SMS (used by ConsoleSmsProvider; a vendor sends its own approved template). */
  otpSms: (code: string) => `کد ورود به پیک‌نامه: ${code}`,
} as const;
