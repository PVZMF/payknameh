---
title: راه‌اندازی محیط محلی
module: infra
owner: mhmoghadamfar
status: active
version: 1.0
updated: 1405-07-12
refs: [Standards §3, Tech §13.2, Tech §13.4]
---

# راه‌اندازی محیط محلی

محیط محلی با Docker Compose یک PostgreSQL و یک MinIO بالا می‌آورد؛ همه‌ی رمزها فقط از فایل `.env` خوانده می‌شوند.

## پیش‌نیازها

- Docker Desktop (یا Docker Engine با Compose v2)
- Node نسخه‌ی موجود در `.nvmrc` و pnpm نسخه‌ی `packageManager` در `package.json`

## شروع

```bash
cp .env.example .env
docker compose up -d
docker compose ps
```

هر دو سرویس `postgres` و `minio` باید `healthy` باشند. سرویس `minio-init` یک‌بار اجرا می‌شود، باکت `S3_BUCKET` را می‌سازد و با کد ۰ خارج می‌شود.

| سرویس       | آدرس                                                 |
| ----------- | ---------------------------------------------------- |
| PostgreSQL  | `localhost:${DB_PORT}` (پیش‌فرض 5432)                |
| MinIO API   | `http://localhost:${S3_PORT}` (پیش‌فرض 9000)         |
| کنسول MinIO | `http://localhost:${S3_CONSOLE_PORT}` (پیش‌فرض 9001) |

## کاربرهای پایگاه داده

اسکریپت `docker/postgres/init-roles.sh` فقط در اولین ساخت volume اجرا می‌شود (Standards §7):

- `DB_MIGRATOR_USER` مالک پایگاه‌ها و schema است و فقط مایگریشن‌ها با آن اجرا می‌شوند.
- `DB_APP_USER` فقط SELECT، INSERT، UPDATE و DELETE دارد و اجازه‌ی ساخت یا حذف جدول ندارد.
- دو پایگاه ساخته می‌شود: `DB_NAME` برای توسعه و `DB_TEST_NAME` برای تست‌های یکپارچه.

## توقف

```bash
docker compose stop      # داده‌ها می‌مانند
docker compose down      # کانتینرها حذف می‌شوند، داده‌ها می‌مانند
```

## بازنشانی کامل

```bash
docker compose down -v   # volumeها و همه‌ی داده‌ها حذف می‌شوند
docker compose up -d     # کاربرها و باکت از نو ساخته می‌شوند
```

اگر مقدارهای `DB_*` در `.env` را عوض کردید، بازنشانی کامل لازم است، چون اسکریپت کاربرها فقط روی volume خالی اجرا می‌شود.

## آینه‌ی رجیستری

Docker Hub درخواست‌های IP ایران را مسدود می‌کند (Tech §13.4). برای دریافت ایمیج‌ها از آینه، فقط `REGISTRY_MIRROR` را در `.env` عوض کنید؛ مسیر ایمیج‌ها بعد از این میزبان ثابت است:

```bash
REGISTRY_MIRROR=docker.arvancloud.ir
```

ایمیج‌های رسمی MinIO دیگر منتشر نمی‌شوند؛ از `pgsty/minio` استفاده می‌کنیم که نسخه‌ی جامعه‌ی همان سرور MinIO است.
