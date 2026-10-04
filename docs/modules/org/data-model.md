---
title: مدل داده‌ی ماژول org
module: org
owner: mhmoghadamfar
status: active
version: 1.0
updated: 1405-07-13
refs: [MVP §5, Tech §7.2, Tech §8, Business §9.1]
---

# مدل داده‌ی ماژول org

فایل‌ها: `src/server/db/schema/org.ts`، `src/server/db/schema/event-members.ts`. مایگریشن: `0001_foundation`.

## organizations

| ستون                       | نوع                                         | قاعده                            |
| -------------------------- | ------------------------------------------- | -------------------------------- |
| `id`                       | uuid (v7)                                   | کلید                             |
| `name`                     | text                                        | الزامی                           |
| `type`                     | `organization_type`: PERSONAL، PROFESSIONAL | پیش‌فرض PERSONAL (Business §9.1) |
| `created_at`، `updated_at` | timestamptz                                 |                                  |

سازمان شخصی هنگام اولین ورود ساخته می‌شود (PK-028) و UI ندارد (MVP §5).

## users

| ستون                       | نوع                                | قاعده                                                                                                              |
| -------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `id`                       | uuid (v7)                          | کلید                                                                                                               |
| `phone_e164`               | text                               | یکتا (`users_phone_e164_unique`) و CHECK قالب E.164 (`^\+[1-9][0-9]{7,14}$`)؛ نرمال‌سازی در لایه‌ی domain (PK-024) |
| `staff_role`               | `staff_role`: NONE، SUPPORT، ADMIN | پیش‌فرض NONE (Tech §8)                                                                                             |
| `created_at`، `updated_at` | timestamptz                        |                                                                                                                    |

## organization_members

عضویت کاربر در سازمان (تصمیم ۱۴۰۵-۰۷-۱۳: جدول عضویت به‌جای `owner_user_id` تا تیم‌های B2B بعداً بدون بازطراحی بیایند).

| ستون              | نوع                               | قاعده                                         |
| ----------------- | --------------------------------- | --------------------------------------------- |
| `organization_id` | uuid                              | FK → organizations، با حذف سازمان حذف می‌شود  |
| `user_id`         | uuid                              | FK → users، با حذف کاربر حذف می‌شود؛ ایندکس   |
| `role`            | `organization_member_role`: OWNER | نقش‌های دیگر با مایگریشن expand اضافه می‌شوند |
| `created_at`      | timestamptz                       |                                               |

کلید اصلی: (`organization_id`, `user_id`).

## event_members

دسترسی کاربر به رویداد (MVP §5)؛ مدل و بررسی دسترسی در MVP هست، UI دعوت نیست.

| ستون         | نوع                                | قاعده                                 |
| ------------ | ---------------------------------- | ------------------------------------- |
| `event_id`   | uuid                               | FK → events، با حذف رویداد حذف می‌شود |
| `user_id`    | uuid                               | FK → users؛ ایندکس                    |
| `role`       | `event_member_role`: OWNER، EDITOR |                                       |
| `created_at` | timestamptz                        |                                       |

کلید اصلی: (`event_id`, `user_id`).
