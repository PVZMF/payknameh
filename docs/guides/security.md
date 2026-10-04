---
title: هدرهای امنیتی و CSRF
module: infra
owner: mhmoghadamfar
status: active
version: 1.0
updated: 1405-07-13
refs: [MVP §8, Tech §12]
---

# هدرهای امنیتی و CSRF

همه‌ی درخواست‌ها از `src/proxy.ts` می‌گذرند و قواعد در `src/server/lib/security-headers.ts` است.

## هدرها (روی همه‌ی پاسخ‌ها)

| هدر                         | مقدار                                                                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Content-Security-Policy`   | nonce تازه برای هر درخواست؛ `script-src 'self' 'nonce-…' 'strict-dynamic'`، `object-src 'none'`، `frame-ancestors 'none'`، `form-action 'self'`. در local برای `next dev` مقدار `'unsafe-eval'` هم هست |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains`، بیرون از local                                                                                                                                                  |
| `X-Content-Type-Options`    | `nosniff`                                                                                                                                                                                              |
| `Referrer-Policy`           | `strict-origin-when-cross-origin` (صفحه‌ی مهمان سخت‌گیرتر می‌شود: PK-102)                                                                                                                              |
| `X-Frame-Options`           | `DENY`                                                                                                                                                                                                 |
| `Permissions-Policy`        | دوربین، میکروفون، مکان، پرداخت و USB خاموش                                                                                                                                                             |

نتیجه‌ی nonce: صفحه‌ها پویا رندر می‌شوند (Next.js با nonce صفحه‌ی ایستا نمی‌سازد). اگر روزی صفحه‌ای به اسکریپت شخص ثالث نیاز داشت، اول این سیاست بازبینی شود.

## CSRF

هر درخواست POST، PUT، PATCH یا DELETE باید هدر `Origin` هم‌میزبان با خود درخواست داشته باشد؛ نبودن یا ناهمخوانی آن ۴۰۳ می‌گیرد. این روی کوکی `SameSite=Lax` اضافه می‌شود و همه‌ی routeها را می‌پوشاند، نه فقط Server Actionها. مسیرهای `/api/webhooks/*` (گزارش تحویل پیامک از سرور فروشنده، PK-120) از این بررسی معاف‌اند و احراز خودشان را دارند.
