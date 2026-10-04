// Standards §2: Persian text for the event module.
export const EVENT_STRINGS = {
  listTitle: "رویدادهای من",
  newEvent: "رویداد تازه",
  emptyTitle: "هنوز رویدادی ندارید",
  emptyHint: "اولین رویدادتان را بسازید؛ بعد مراسم‌ها و مهمان‌ها را اضافه می‌کنید.",
  ownerBadge: "مالک",
  editorBadge: "ویرایشگر",
  couple: (bride: string, groom: string) => `${bride} و ${groom}`,

  createTitle: "ساخت رویداد",
  createIntro:
    "اطلاعات کلی رویداد را بنویسید. تاریخ و مکان هر مراسم را در مرحله‌ی بعد وارد می‌کنید.",
  titleLabel: "عنوان رویداد",
  titlePlaceholder: "مثلاً عروسی سارا و علی",
  brideLabel: "نام عروس",
  groomLabel: "نام داماد",
  parentsLabel: "نام پدر و مادرها",
  parentsHint: "اختیاری؛ همان‌طور که می‌خواهید روی کارت بیاید.",
  optional: "اختیاری",
  create: "ساخت رویداد",
  creating: "در حال ساخت…",
  cancel: "انصراف",

  backToEvents: "رویدادهای من",
  nav: {
    overview: "نمای کلی",
    sessions: "مراسم‌ها",
    guests: "مهمانان",
    invitation: "دعوت‌نامه",
    responses: "پاسخ‌ها",
    sending: "ارسال",
  },
  soon: "به‌زودی",
  overviewNext: "قدم بعدی: مراسم‌ها را با تاریخ، ساعت و مکان اضافه کنید.",

  errors: {
    INVALID_INPUT: "عنوان رویداد را وارد کنید و نام‌ها را کوتاه‌تر بنویسید.",
    EVENT_CREATE_DENIED: "اجازه‌ی ساخت رویداد را ندارید.",
  },
} as const;
