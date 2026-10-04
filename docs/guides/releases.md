---
title: نسخه‌گذاری و انتشار
module: ci
owner: mhmoghadamfar
status: active
version: 1.0
updated: 1405-07-12
refs: [Standards §4, Standards §5, Standards §9, Decision D-27]
---

# نسخه‌گذاری و انتشار

نسخه‌ی برنامه را هیچ‌کس دستی عوض نمی‌کند. release-please از پیام‌های Conventional Commits نسخه‌ی بعدی و `CHANGELOG.md` را می‌سازد (Standards §5).

## فایل‌ها

| فایل                                   | کار                                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `release-please-config.json`           | قواعد نسخه: پیش از 1.0.0 تغییر شکستنی فقط MINOR را بالا می‌برد؛ عنوان PR نسخه `chore(ci): release X.Y.Z` است. |
| `.release-please-manifest.json`        | آخرین نسخه‌ی منتشرشده (شروع از `0.0.0`).                                                                      |
| `.github/workflows/release-please.yml` | روی هر push به `main` اجرا می‌شود و PR نسخه را باز یا به‌روز می‌کند.                                          |
| `scripts/rc-version.ts`                | نسخه‌ی staging را چاپ می‌کند: `X.Y.0-rc.N`.                                                                   |

## یک MINOR برای هر فاز

- هر فاز MVP با یک MINOR تمام می‌شود: پایان فاز ۱ → `0.1.0`.
- PR نسخه‌ای که release-please روی `main` باز می‌کند در تمام طول فاز باز می‌ماند و فقط در پایان فاز merge می‌شود. merge آن `package.json` و `CHANGELOG.md` را به‌روز می‌کند و تگ `vX.Y.Z` می‌سازد؛ تگ تنها راه انتشار در production است.
- برای انتشار عمومی، در `release-please-config.json` مقدار `"release-as": "1.0.0"` را برای همان یک انتشار بگذارید و بعد حذف کنید.

## نسخه‌ی rc در staging

هر build staging نسخه‌ی انتشار بعدی را با شمارنده‌ی rc دارد؛ production فقط نسخه‌ی بدون پسوند می‌بیند.

```bash
pnpm release:rc-version          # انتشار عادی فاز: 0.1.0-rc.N
pnpm release:rc-version patch    # hotfix: 0.1.1-rc.N
```

`N` تعداد commitهای `main` از آخرین تگ `v*` است. استقرار staging (PK-014) این مقدار را به‌عنوان build arg `APP_VERSION` به Docker می‌دهد؛ همان مقدار در `/health` و هدر `X-App-Version` دیده می‌شود. بدون `APP_VERSION` نسخه‌ی `package.json` گزارش می‌شود.

## روش merge

- PRهای کاری به `develop` و `main` فقط squash merge می‌شوند (Standards §4).
- PR انتشار (`develop` → `main` با عنوان `release: vX.Y.Z`) و back-merge (`main` → `develop`) با merge commit ادغام می‌شوند تا تاریخچه حفظ شود. CI عنوان این دو نوع PR را با commitlint بررسی نمی‌کند، چون عنوانشان commit نمی‌شود؛ commitهای داخلشان همچنان بررسی می‌شوند.
