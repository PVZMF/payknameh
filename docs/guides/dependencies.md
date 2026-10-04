---
title: به‌روزرسانی وابستگی‌ها و اسکن آسیب‌پذیری
module: deps
owner: mhmoghadamfar
status: active
version: 1.0
updated: 1405-07-12
refs: [Tech §12, Tech §13.4, Standards §4]
---

# به‌روزرسانی وابستگی‌ها و اسکن آسیب‌پذیری

## Renovate

`renovate.json` قواعد را نگه می‌دارد؛ خود Renovate به‌صورت GitHub App روی مخزن نصب می‌شود.

- PRها به `develop` می‌روند و مثل هر کار دیگری CI کامل و squash merge دارند.
- هفته‌ای یک بار (شنبه پیش از ساعت ۹ به وقت تهران) و فقط برای نسخه‌هایی که دست‌کم ۳ روز از انتشارشان گذشته است.
- به‌روزرسانی‌های minor و patch همه در یک PR («non-major dependencies»)، GitHub Actions در یک PR، و Node در `.nvmrc` و `packageManager` با هم. نسخه‌های major هر کدام PR جدا دارند.
- عنوان PRها کوتاه است تا با commitlint (حداکثر ۷۲ نویسه) بخواند.
- سه بسته عمداً پایین نگه داشته شده‌اند: TypeScript زیر 6.1 (typescript-eslint)، ESLint زیر 10 (eslint-plugin-react) و lint-staged زیر 17 (نیاز به Node ≥ 22.22.1). با برطرف شدن هر محدودیت، قاعده‌اش را از `renovate.json` بردارید.
- تصویر پایه‌ی Docker از `ARG NODE_IMAGE` خوانده می‌شود و ممکن است Renovate آن را نبیند؛ هنگام به‌روزرسانی Node آن را هم دستی هم‌گام کنید.

## اسکن آسیب‌پذیری در CI

job `Dependency audit` روی هر PR فقط فایل قفل را بررسی می‌کند:

| بخش                                           | قاعده                                                                            |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| وابستگی‌های production (آنچه در ایمیج می‌رود) | هر advisory با شدت high یا critical، merge را متوقف می‌کند.                      |
| وابستگی‌های توسعه (lint، تست، build)          | فقط گزارش می‌شود (هشدار و خلاصه‌ی job)؛ وصله که منتشر شد Renovate آن را می‌آورد. |

اجرای محلی: `pnpm audit --prod --audit-level=high`.
