---
title: مدل داده‌ی ماژول org
module: org
owner: mhmoghadamfar
status: active
version: 1.0
updated: 1405-07-13
refs: [MVP §5, Tech §7.2, Tech §8, Tech §11, Business §7, Business §9.1]
---

# مدل داده‌ی ماژول org

فایل‌ها: `src/server/db/schema/org.ts`، `src/server/db/schema/event-members.ts`. مایگریشن‌ها: `0001_foundation`، `0003_audit_logs`.

## organizations

| ستون                       | نوع                                         | قاعده                            |
| -------------------------- | ------------------------------------------- | -------------------------------- |
| `id`                       | uuid (v7)                                   | کلید                             |
| `name`                     | text                                        | الزامی                           |
| `type`                     | `organization_type`: PERSONAL، PROFESSIONAL | پیش‌فرض PERSONAL (Business §9.1) |
| `created_at`، `updated_at` | timestamptz                                 |                                  |

سازمان شخصی هنگام اولین ورود ساخته می‌شود و UI ندارد (MVP §5): `ensureHostAccount()` در `src/server/services/org` کاربر، سازمان PERSONAL و عضویت OWNER را در تراکنش تأیید کد می‌سازد (PK-028).

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

## audit_logs

ثبت فقط‌افزودنی کارهای حساس (Tech §8، §11؛ Business §7): چرخش یا ابطال توکن، INVITED به EXCLUDED، حذف Session، تغییر زمان یا مکان، دسترسی تیم. نوشتن با `recordAudit()` در `src/server/services/org`، داخل همان تراکنش کار.

| ستون                       | نوع                                            | قاعده                                                                       |
| -------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------- |
| `id`                       | uuid (v7)                                      | کلید                                                                        |
| `actor_type`               | `audit_actor_type`: HOST، GUEST، STAFF، SYSTEM |                                                                             |
| `actor_id`                 | uuid                                           | کاربر برای HOST و STAFF، خانوار برای GUEST، خالی برای SYSTEM                |
| `action`                   | text                                           | `module.verb-past`، مثل `guest.token-rotated`؛ CHECK قالب                   |
| `entity_type`، `entity_id` | text، uuid                                     |                                                                             |
| `event_id`                 | uuid                                           | بدون FK عمدی: حذف رویداد نباید ردیف ممیزی را تغییر دهد یا جلوی حذف را بگیرد |
| `reason`                   | text                                           | برای STAFF الزامی (CHECK `audit_logs_staff_reason`)                         |
| `created_at`               | timestamptz                                    |                                                                             |

ایندکس: (`event_id`, `created_at`).

- **فقط‌افزودنی:** تریگر `audit_logs_reject_change` هر UPDATE، DELETE و TRUNCATE را با خطای `42501` رد می‌کند؛ برای همه‌ی نقش‌ها، چون نام نقش برنامه در هر محیط فرق دارد.
- **بدون داده‌ی شخصی:** فقط شناسه‌ها؛ نام، شماره و متن پیام در این جدول نمی‌آید.
