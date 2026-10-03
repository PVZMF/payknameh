// Standards §2: Persian UI strings live in src/strings/<module>.ts, never inside components.
// Shared strings that belong to no single module live here.
export const COMMON_STRINGS = {
  appName: "پیک‌نامه",
  tagline: "دعوت‌نامه‌ی دیجیتال برای مراسم شما",
  startCta: "ساخت دعوت‌نامه",
  sessionsSample: (count: string) => `${count} مراسم، یک دعوت‌نامه`,
} as const;
