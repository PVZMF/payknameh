---
title: مجوز اجزای شخص ثالث
module: ui
owner: mhmoghadamfar
status: active
version: 1.0
updated: 1405-07-12
refs: [Standards §2, Tech §3.2, Tech §3.5]
---

# مجوز اجزای شخص ثالث

هر کامپوننت shadcn/ui، کد کپی‌شده از کتابخانه‌ی افکت، فونت یا ایمیجی که کدش در مخزن یا در محیط ما اجرا می‌شود، همین‌جا با مجوزش ثبت می‌شود (Standards §2).

## کامپوننت‌ها و کد کپی‌شده در مخزن

| جزء           | مسیر در مخزن                   | منبع                      | مجوز | کارت   |
| ------------- | ------------------------------ | ------------------------- | ---- | ------ |
| Button        | `src/ui/components/button.tsx` | shadcn/ui (new-york, rtl) | MIT  | PK-019 |
| `cn()` helper | `src/ui/lib/utils.ts`          | shadcn/ui                 | MIT  | PK-019 |

## فونت

| جزء                                       | مسیر                      | منبع                             | مجوز                                 |
| ----------------------------------------- | ------------------------- | -------------------------------- | ------------------------------------ |
| Vazirmatn v33.003 (وزن‌های ۴۰۰، ۵۰۰، ۷۰۰) | `src/ui/fonts/vazirmatn/` | github.com/rastikerdar/vazirmatn | SIL OFL 1.1 (`OFL.txt` کنار فایل‌ها) |

## کتابخانه‌های UI (وابستگی npm)

| بسته                                           | مجوز |
| ---------------------------------------------- | ---- |
| tailwindcss، @tailwindcss/postcss              | MIT  |
| radix-ui                                       | MIT  |
| class-variance-authority، clsx، tailwind-merge | MIT  |
| tw-animate-css                                 | MIT  |
| lucide-react                                   | ISC  |

## ایمیج‌های محیط محلی

| ایمیج                                      | مجوز               | توضیح                                                                     |
| ------------------------------------------ | ------------------ | ------------------------------------------------------------------------- |
| `pgsty/minio:RELEASE.2026-08-04T00-00-00Z` | AGPL-3.0           | فقط محلی؛ نسخه‌ی جامعه‌ی سرور MinIO چون ایمیج رسمی منتشر نمی‌شود (PK-004) |
| `postgres:18.6-alpine`                     | PostgreSQL License | فقط محلی                                                                  |
