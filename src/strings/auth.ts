// Standards §2: Persian text for the auth module. Error codes map to messages here; no
// technical message is ever shown to the user.
export const AUTH_STRINGS = {
  /** Login code SMS (used by ConsoleSmsProvider; a vendor sends its own approved template). */
  otpSms: (code: string) => `کد ورود به پیک‌نامه: ${code}`,

  loginTitle: "ورود به پیک‌نامه",
  loginIntro: "شماره‌ی موبایلتان را وارد کنید تا کد ورود برایتان پیامک شود.",
  phoneLabel: "شماره‌ی موبایل",
  phonePlaceholder: "۰۹۱۲۱۲۳۴۵۶۷",
  sendCode: "ارسال کد",
  sending: "در حال ارسال…",

  verifyTitle: "کد ورود را وارد کنید",
  verifyIntro: (maskedPhone: string) => `کد ۶ رقمی به ${maskedPhone} پیامک شد.`,
  codeLabel: "کد ورود",
  verify: "ورود",
  verifying: "در حال بررسی…",
  resend: "ارسال دوباره‌ی کد",
  resendIn: (seconds: string) => `ارسال دوباره تا ${seconds} ثانیه‌ی دیگر`,
  changePhone: "تغییر شماره",

  errors: {
    PHONE_INVALID: "شماره‌ی موبایل درست نیست. شماره را مثل ۰۹۱۲۱۲۳۴۵۶۷ وارد کنید.",
    OTP_RATE_LIMITED: (seconds: string) =>
      `درخواست‌ها زیاد شده است. ${seconds} ثانیه‌ی دیگر دوباره امتحان کنید.`,
    SMS_SEND_FAILED: "ارسال پیامک انجام نشد. چند لحظه‌ی دیگر دوباره امتحان کنید.",
    OTP_INVALID: "کد درست نیست. دوباره بررسی کنید.",
    OTP_EXPIRED: "این کد منقضی شده است. کد تازه بگیرید.",
    OTP_ATTEMPTS_EXCEEDED: "تلاش‌ها بیش از حد شد. کد تازه بگیرید.",
  },
} as const;
