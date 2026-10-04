---
title: مدل داده‌ی ماژول event
module: event
owner: mhmoghadamfar
status: active
version: 1.0
updated: 1405-07-13
refs: [MVP §2, MVP §5, Tech §7.2, Tech §8, Business §9.1]
---

# مدل داده‌ی ماژول event

فایل: `src/server/db/schema/event.ts`. مایگریشن: `0001_foundation`.

## events

رویداد ظرف کلی جشن است؛ تاریخ، ساعت و مکان روی Session است و هرگز روی Event نمی‌آید (MVP §2).

| ستون                                | نوع                   | قاعده                                                                                        |
| ----------------------------------- | --------------------- | -------------------------------------------------------------------------------------------- |
| `id`                                | uuid (v7)             | کلید                                                                                         |
| `organization_id`                   | uuid                  | FK → organizations با `ON DELETE RESTRICT`؛ ایندکس                                           |
| `event_type`                        | `event_type`: WEDDING | پیش‌فرض WEDDING (Business §9.1)؛ نوع‌های دیگر با مایگریشن expand                             |
| `title`                             | text                  | الزامی؛ CHECK خالی نبودن                                                                     |
| `bride_name`، `groom_name`          | text                  | اختیاری؛ دو فیلد جدا به‌جای `coupleNames` (تصمیم ۱۴۰۵-۰۷-۱۳) تا نوع‌های غیرعروسی خالی بمانند |
| `parents`                           | text                  | اختیاری، متن آزاد (MVP §5)                                                                   |
| `timezone`                          | text                  | پیش‌فرض `Asia/Tehran`                                                                        |
| `archived_at`، `purge_scheduled_at` | timestamptz           | فقط بایگانی ذخیره می‌شود؛ فعال یا نگه‌داشته محاسبه می‌شود (Tech §8)                          |
| `version`                           | integer               | پیش‌فرض 1؛ قفل خوش‌بینانه (Tech §7.2)                                                        |
| `created_at`، `updated_at`          | timestamptz           |                                                                                              |
