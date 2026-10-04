---
title: مدل داده‌ی ماژول auth
module: auth
owner: mhmoghadamfar
status: active
version: 1.0
updated: 1405-07-13
refs: [Tech §2.8, Tech §7.6, Tech §12]
---

# مدل داده‌ی ماژول auth

فایل: `src/server/db/schema/auth.ts`.

## rate_limit_hits

محدودیت نرخ روی PostgreSQL با پنجره‌ی زمانی ثابت (Tech §2.8، §7.6). مایگریشن: `0002_rate_limits`.

| ستون           | نوع         | قاعده                                                             |
| -------------- | ----------- | ----------------------------------------------------------------- |
| `key_hash`     | text        | SHA-256 از «نام قاعده + کلید»؛ شماره یا IP هرگز خام ذخیره نمی‌شود |
| `window_start` | timestamptz | شروع پنجره، از زمان خود پایگاه داده؛ ایندکس برای پاک‌سازی         |
| `count`        | integer     | تعداد درخواست در این پنجره                                        |

کلید اصلی: (`key_hash`, `window_start`). شمارش با یک upsert اتمی است، پس درخواست‌های هم‌زمان یک شمارنده را می‌بینند. کار روزانه‌ی `auth.prune-rate-limits` (۰۰:۳۰ UTC) پنجره‌های قدیمی‌تر از یک روز را حذف می‌کند.
