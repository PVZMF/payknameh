---
title: پایگاه داده و مایگریشن
module: infra
owner: mhmoghadamfar
status: active
version: 1.0
updated: 1405-07-12
refs: [Tech §7.2, Tech §13.3, Standards §5, Standards §7]
---

# پایگاه داده و مایگریشن

Drizzle روی PostgreSQL با درایور `pg` استفاده می‌شود؛ مایگریشن‌ها فقط با کاربر جداگانه‌ی مایگریشن اجرا می‌شوند و کاربر برنامه حق DDL ندارد (Standards §7).

## فایل‌ها

| مسیر                               | نقش                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `src/server/db/drizzle.config.ts`  | تنظیمات drizzle-kit                                                       |
| `src/server/db/client.ts`          | `getDb()` و `getPool()` با کاربر برنامه (`DB_URL`)                        |
| `src/server/db/schema/index.ts`    | نقطه‌ی ورود schema؛ جدول‌های هر ماژول اینجا export می‌شوند                |
| `src/server/db/schema/<module>.ts` | جدول‌های هر ماژول؛ مستند هر جدول در `docs/modules/<module>/data-model.md` |
| `src/server/db/columns.ts`         | ستون‌های مشترک: `id()`، `timestamptz()`، `timestamps`، `version()`        |
| `src/server/db/migrations/`        | مایگریشن‌های تولیدشده؛ بعد از ادغام ویرایش نمی‌شوند                       |

## دستورها

```bash
pnpm db:generate                       # ساخت مایگریشن از تغییر schema (فایل SQL را بازبینی کنید)
pnpm db:generate --custom --name <name> # مایگریشن SQL دستی
pnpm db:migrate                        # اجرای مایگریشن‌ها با DB_MIGRATE_URL
pnpm db:seed                           # داده‌ی نمونه (از PK-037)
```

## قراردادها (Tech §7.2)

- **شناسه:** همه‌ی کلیدهای اصلی UUIDv7 هستند و در کد ساخته می‌شوند (`id()` در `columns.ts`)، تا روی هر نسخه‌ی PostgreSQL کار کند.
- **زمان:** همه‌ی ستون‌های زمانی `timestamptz` هستند (`timestamptz()`). مایگریشن پایه منطقه‌ی زمانی پایگاه را UTC می‌کند.
- **نام‌گذاری:** جدول‌ها snake_case و جمع (`household_members`)؛ کلیدهای TypeScript به‌صورت camelCase نوشته می‌شوند و با `casing: "snake_case"` به ستون snake_case تبدیل می‌شوند.
- **مبلغ:** `bigint` به ریال.
- **حذف نرم:** ستون `deletedAt` یا `removedAt` طبق سند MVP.

## قواعد مایگریشن (Standards §7)

- فقط expand: ستون یا جدول جدید nullable یا با مقدار پیش‌فرض؛ حذف و تغییر نام فقط با الگوی expand/contract در چند انتشار.
- مایگریشن قبل از کد جدید و به‌صورت مرحله‌ی جدا اجرا می‌شود و هرگز به عقب برنمی‌گردد.
- هر تغییر مدل داده در `docs/modules/<module>/data-model.md` همان PR ثبت می‌شود.

## صف کارها (pg-boss)

- `pnpm db:migrate` بعد از مایگریشن‌های Drizzle، schema‌ی `pgboss` و همه‌ی صف‌های فهرست `QUEUES` در `src/server/lib/queue.ts` را با کاربر مایگریشن می‌سازد؛ worker و برنامه با `migrate: false` اجرا می‌شوند (Tech §7.5).
- نام صف `module.verb` است. سیاست هر صف بعد از ساخت ثابت است؛ تغییر آن یعنی صف با نام تازه.
- volumeهایی که پیش از PK-008 ساخته شده‌اند حق USAGE روی schemaهای تازه را ندارند؛ یک‌بار `docker compose down -v` اجرا کنید.
