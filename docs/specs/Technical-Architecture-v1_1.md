**Payknameh (پیک‌نامه)**

**Architecture and Technical Decisions Document**

Version 1.1 — Mehr 1405 (October 2026)

| **Attribute** | **Value** |
| --- | --- |
| Version | 1.1 |
| Status | Draft for team review |
| Reference document | MVP Final Decisions Document, version 1.2 |
| Scope | Architecture, tech stack, frontend, backend, data, security, infrastructure, testing |

**Version history**

| **Version** | **Date** | **Changes** |
| --- | --- | --- |
| 1.1 | Mehr 1405 | Expanded section 2 (overall architecture): system overview diagram, code layers diagram, invitation-opening flow diagram, deployment diagram, other main flows, and an architecture decisions table with review criteria |
| 1.0 | Mehr 1405 | First version: tech stack selection, architecture, template system, music, backend, supplementary data model, billing readiness, metrics, team panel, security, DevOps, testing and implementation order |

**Sections**

1. Summary of decisions
2. Overall architecture
3. Frontend
4. Guest page and PWA
5. Template system
6. Music
7. Backend
8. Data model: changes relative to the MVP document
9. Billing and payment (technical readiness)
10. Metrics and analytics
11. Internal team panel
12. Security and privacy
13. Infrastructure and DevOps
14. Testing and quality
15. Event lifecycle and data retention
16. Technical implementation order
17. Open technical decisions

# **1. Summary of decisions**

This document is the technical companion to the "MVP Final Decisions Document, version 1.2". The MVP document defines **what** is built; this document defines **with which tools, on which infrastructure and under which rules** it is built. Where the two documents conflict, domain rules come from the MVP document and technical decisions from this document.

Business topics (pricing, invoicing, business metrics) are covered here only from the technical side: the data model, flows and rules that make implementing them possible and reliable.

## **1.1 Key decisions**

| **Area** | **Decision** |
| --- | --- |
| Framework | Next.js (App Router) with strict TypeScript, for frontend and backend in one codebase |
| Background jobs | A separate worker process from the same codebase, with a pg-boss queue on PostgreSQL |
| Database | Managed PostgreSQL with Drizzle ORM |
| UI | Tailwind CSS v4 and shadcn/ui, full RTL, self-hosted Vazirmatn font |
| Animation | Motion as the base; effect libraries (e.g. React Bits) only as copied and rewritten code |
| Hosting | Iranian server; start on Liara, with a Docker-based architecture portable to ArvanCloud or a dedicated server |
| File storage | S3-compatible Object Storage behind a CDN, with content-hash-based keys |
| Authentication | SMS OTP with in-house implementation; DB-backed session and httpOnly cookie |
| Maps | Neshan web SDK and API for location picking; Neshan, Balad and Google Maps routing links from coordinates |
| SMS | SmsProvider interface; vendor is in open decisions |
| Payment | PaymentProvider interface and billing data model; implementation after the MVP |
| Music | Payknameh music library plus host upload with selection of a segment of the track |
| Analytics | Internal event logging; self-hosted Umami only on the marketing site |
| Testing | Vitest for domain and integration, Playwright for end-to-end and visual template tests |

## **1.2 Technical principles**

These principles are the decision criteria for unforeseen cases:

- **One language, one codebase.** TypeScript everywhere; validation schemas and types are defined once and used by forms, server, worker and the future agent.

- **Domain independent of framework.** The rules in section 6 of the MVP document are implemented in a layer that has no dependency on Next.js, the database or any external service.

- **The server is the source of truth.** Every check of access, deadlines, attendee caps and paid entitlements happens server-side. Form validation is only for user experience.

- **The guest page is light and has no third parties.** No external scripts, fonts or analytics, with a measurable size budget.

- **Everything published is immutable.** Template versions, their assets, published content, invoices and response history are never overwritten.

- **Portability.** Docker, standard PostgreSQL and the standard S3 API; dependence on a vendor's proprietary features is forbidden.

- **Start simple.** A new component (Redis, a separate service, a separate queue) is added only when there is a real, measured need.

- **Budgets are law.** Page size, template size and load time have specific numbers and are checked in CI.

# **2. Overall architecture**

Payknameh is a **modular monolith**: one Next.js web app and one worker process, both from one TypeScript codebase, on one PostgreSQL database and one Object Storage. Internal boundaries (layers and external service interfaces) are drawn so that each part can be split off in the future, only if there is a real need.

## **2.1 System overview**

Figure 1 — System overview

All inputs, whether from the browser or the worker, pass through the services layer, and business rules are implemented only in the domain layer. External services are never called directly; each sits behind an interface (adapter) so a vendor can be swapped without changing logic.

## **2.2 System components**

| **Component** | **Role** | **Technology** |
| --- | --- | --- |
| Web app | Marketing site, host panel, guest page, API, internal team panel | Next.js in standalone mode inside Docker |
| Worker | SMS sending, image and audio processing, Excel import/export, scheduled jobs | Node.js, same codebase with a separate entrypoint |
| Database | Main data, job queue, rate limiting | Managed PostgreSQL |
| File storage | Images, audio, template assets, export files | S3-compatible Object Storage |
| CDN | Static assets and templates with long-lived caching | CDN of an Iranian provider |
| External services | SMS, maps, payment gateway (after MVP) | Via the SmsProvider, MapProvider and PaymentProvider interfaces |

## **2.3 Domains**

Three access surfaces sit on two domains. All three are served by one Next.js app, and middleware routes requests to the appropriate route group based on host.

| **Address** | **Content** | **Note** |
| --- | --- | --- |
| Main domain | Marketing site | Indexable; the only place Umami is enabled |
| `app` subdomain of the main domain | Host panel and internal team panel | Session cookie only on this subdomain |
| Short `.ir` domain | Only the `/i/<token>` route and the guest API | No host cookie; noindex; shortness directly affects SMS cost |

## **2.4 Layered architecture and code structure**

Figure 2 — Code layers and dependency direction

| **Layer** | **Responsibility** | **May depend on** |
| --- | --- | --- |
| Entrypoints | Server Actions, Route Handlers, worker jobs, the future agent; only input validation and service calls | services |
| services | Use cases, actor-based access checks, transactions | domain, db, providers |
| db and providers | Database access and external services behind interfaces | domain (types only) |
| domain | Entities, rules, schemas, status computation | nothing |

```
src/
  domain/            # rules, entities, zod schemas — no framework imports
  server/
    services/        # application services (use cases), access checks
    db/              # drizzle schema, migrations, queries
    jobs/            # pg-boss job handlers
    providers/       # sms, maps, payment, storage adapters
  app/
    (marketing)/     # landing site
    (host)/          # host dashboard
    (guest)/         # guest invitation pages
    (staff)/         # internal team panel
    api/             # route handlers
  renderer/          # template renderer, shared layouts
  ui/                # shared components (shadcn/ui based)
  strings/           # all Persian UI strings
templates/<slug>/<version>/   # template packages (section 5)
worker.ts                     # worker entrypoint
```

The dependency rule is checked in CI with ESLint (import restriction rule). Each domain module (event, guests, invitation, response, delivery, billing) has its own folder inside `domain` and `services`, and modules communicate only through each other's public services, never by directly accessing each other's tables.

## **2.5 Invitation-opening flow**

Figure 3 — Invitation opening and response submission flow

Messenger preview bots only send GET requests. Because personal data and view recording happen only in response to a POST after user interaction, the rule in section 6.1 of the MVP document is guaranteed structurally, not by User-Agent detection.

## **2.6 Other main flows**

| **Flow** | **Path through the system** |
| --- | --- |
| Sending invitation SMS | Host panel → delivery service (check INVITED state, SMS credit, create InvitationDelivery) → queue → worker → SmsProvider → webhook or periodic status check → dashboard update |
| Image or audio upload | Host panel → get signed URL from service → direct upload to Object Storage → queue → worker (validation and processing) → EventAsset ready |
| Host enters or corrects a response | Host panel → response service (actor: HOST, no deadline restriction) → RSVPResponse and RSVPEvent in one transaction |
| Publishing the invitation | Host panel → invitation service (validate content against template schema, check Entitlement) → snapshot into publishedContent and pin template version |
| Excel import | Host panel → file upload → worker (parsing) → column mapping and preview in panel → confirmation → create CANDIDATE households in a transaction |
| Payment (after MVP) | Host panel → Order → PaymentProvider and gateway → callback and server-side verification → Payment, Entitlement and invoice in one transaction |

## **2.7 Deployment view**

Figure 4 — Deployment and release view

The web app and worker are built from one Docker image and differ only in their run command. Hosting details, environments, CI/CD, backup and monitoring are in section 13.

## **2.8 Architecture decisions and review criteria**

Each simplification decision has a specific review point. Until that point is reached, the architecture does not change.

| **Decision** | **Reason** | **When to review** |
| --- | --- | --- |
| Monolith instead of microservices | Small team, cohesive domain, build speed and simple deployment | When a part gets a completely different load or release cycle (e.g. the AI agent or media processing) |
| Next.js for front and back | One language, shared types and schemas, server-side rendering for the guest page | If a native mobile app needs a stable public API; the services layer can expose a separate API without rewriting logic |
| Queue on PostgreSQL (pg-boss) | No extra infrastructure; transactions shared with data | When job volume or queue latency affects the main database |
| Rate limiting on PostgreSQL | Simplicity | When public route traffic puts noticeable load on the database; then Redis |
| In-house authentication | Only mobile login is needed; generic libraries add overhead | If other login methods or enterprise SSO are needed |
| Templates as code | One template in the MVP; high quality | When level-2 customization and the template marketplace start; move to the no-code format in MVP §13.3 |

# **3. Frontend**

## **3.1 Three surfaces and the policy for each**

| **Surface** | **Goal** | **Tooling and animation policy** |
| --- | --- | --- |
| Marketing site | Acquisition and sales | Free: visual effects, animated backgrounds and effect libraries are allowed. |
| Host panel | Daily working tool | Calm and predictable: only shadcn/ui and small functional animations (branch expand, state change). |
| Guest card and page | Feeling and beauty, with speed | Animation allowed but under the size budget; no WebGL; everything takes colors from the template's design tokens. |

## **3.2 Frontend stack**

| **Need** | **Tool** | **Note** |
| --- | --- | --- |
| Base components | shadcn/ui (on Radix) | Code lives in the project and can be adapted for RTL and tokens |
| Styling | Tailwind CSS v4 | Logical classes only (`ms-*`, `pe-*`, `start-*`) |
| Forms | react-hook-form and zod | Schemas come from `domain` |
| Jalali dates | shadcn/ui Calendar (react-day-picker with Persian calendar) and date-fns-jalali | Consistent with the rest of the UI, no mismatched library |
| Guest tree | dnd-kit | Moving branches and households |
| Large lists | TanStack Virtual and TanStack Table | For household lists in the hundreds |
| Animation | Motion | On the guest page, loaded only after the click |
| Dashboard charts | shadcn/ui charts (Recharts) | Only in the host panel and team panel |
| Audio waveform | wavesurfer.js with the regions plugin | Only in the host panel |
| PWA | Serwist | Limited to guest routes |
| Icons | lucide-react | Individual imports for tree-shaking |

## **3.3 RTL and Persian typography**

- `dir="rtl"` and `lang="fa"` on the document; Radix DirectionProvider for shadcn/ui components.

- Using left/right in CSS and Tailwind classes is forbidden by a lint rule; logical properties only.

- Vazirmatn via `next/font/local`, only the weights used, woff2 and subset.

- Numbers everywhere are shown with Persian digits via `Intl.NumberFormat("fa-IR")`; inputs accept Persian, Arabic and Latin digits.

- Latin text inside a Persian sentence (phone numbers, links) is isolated with a `bdi` element or `dir="ltr"` so display order does not break.

- All UI strings are kept in the `strings` folder, not inside components.

## **3.4 Data fetching and state management**

- Reads via React Server Components that call `server/services` directly.

- Writes via Server Actions; each action only validates input with zod and calls the domain service. No business logic is written inside an action.

- TanStack Query only for highly interactive parts (guest tree view, card editor).

- Next.js caching is used only explicitly and for public data; host and guest data are never in a shared cache.

- No global state manager at the start; Zustand if there is a real need.

## **3.5 Animation and effect library policy**

Libraries like React Bits, Aceternity UI and Magic UI are used as raw material, not as direct dependencies:

- The component is copied, adapted for RTL, and its colors and spacing are wired to the template's design tokens.

- **Persian text is never split letter by letter.** Splitting by letter breaks Persian letter joining; text animation is only allowed at word or line level.

- On the guest card, WebGL-based components (three.js, OGL) are forbidden; their equivalents are rewritten with CSS or Motion.

- All animations respect `prefers-reduced-motion` and have a static version.

- Each component's license is recorded before it is brought in. For components used in paid templates, restrictions like the Commons Clause are reviewed separately.

## **3.6 Accessibility**

Some guests, especially the parents' and grandparents' generation, open the card on mid-range phones with enlarged fonts. Minimums:

- Body text on the guest page at least 16px and button touch targets at least 44px.

- Color contrast at WCAG AA for informational text, even in decorative templates.

- The response form can be completed one-handed without a keyboard (attendee count chosen with + and − buttons).

- The page does not break with system font scaling up to 200%.

## **3.7 Host onboarding**

Onboarding is a guided checklist in the host panel: create sessions, add guests, invite and assign, create the card, publish and send. Technically:

- Each step's status is **computed from data** (e.g. "at least one session exists"), not stored as a flag; the same "status is computed" principle as in the MVP document.

- Only the user's decision to dismiss the guide is stored (per user and event).

- Each section's empty states suggest the next step.

- Completing each step logs an internal analytics event so the activation funnel is measurable (section 10).

# **4. Guest page and PWA**

## **4.1 Staged loading**

| **Stage** | **What loads** | **Goal** |
| --- | --- | --- |
| 0. Entry page | Public HTML, light poster, open button | Instant display; at most about 100 KB |
| 1. Entry page idle time | Prefetch of template code and above-the-fold assets | Hide loading time behind the entry page |
| 2. After click | Personal data, view recording, opening animation | Feeling of immediacy |
| 3. After the card is shown | Lower-page images (lazy), music as stream | No effect on start |

## **4.2 In-app browsers of messengers**

Most guests open the link inside Telegram, Bale, Eitaa, Rubika, Instagram or WhatsApp. **It is not possible to bypass these apps' in-app browsers or guarantee opening in the main browser**; each app and OS behaves differently, and many users don't have an "open in external browser" setting. So the policy is:

- **The card must work fully in the in-app browser.** This is the main path, not an edge case.

- The environment is detected via User-Agent, and an alternative is shown only for incompatible features.

- On Android, a helper "Open in browser" link to Chrome with an `intent://` URL is offered; it works in many in-app browsers but is not guaranteed.

- On iOS there is no reliable programmatic way; a short visual guide (app menu → open in Safari) is shown, only when the user tries an incompatible feature.

| **Feature** | **Problem in in-app browser** | **Solution** |
| --- | --- | --- |
| Add to calendar | ICS file download often fails | Google Calendar web link alongside ICS; on error, guide to open in browser |
| Music | Audio playback is sometimes blocked | Playback only on user click; on failure, a manual play button with no error message |
| Routing | App links (scheme) may not open | Only https links for Neshan, Balad and Google Maps |
| PWA install | Not possible | Install prompt shown only in the main browser |

## **4.3 Calendar and routing**

- ICS file with `TZID=Asia/Tehran` and a VTIMEZONE block, and the correct Content-Type (`text/calendar`).

- Google Calendar link built with UTC time.

- Neshan, Balad and Google Maps links built only from coordinates (lat, lng), per MVP §6.8.

## **4.4 Offline cache**

- The Service Worker is active only on guest routes and never caches host or team panel routes.

- The cache contains the page shell, font and critical assets of the template the guest saw; not the whole template library and not music.

- The last guest API response is kept only on that device so essential info (time, place, routing) is available offline. Submitting a response offline is not possible and a clear message is shown.

## **4.5 Performance budget**

| **Metric** | **Initial target** | **How measured** |
| --- | --- | --- |
| Entry page size (stage 0) | About 100 KB compressed | size-limit in CI |
| Size until card display (stage 2) | About 500 KB to 1 MB, depending on template | Template manifest budget |
| Entry page LCP | Under 2.5 s on a mid-range Android and mobile internet | Lighthouse CI with mobile profile |
| INP | Under 200 ms | Lighthouse and manual testing on a real device |

These numbers will be reviewed after testing on real devices and fixed in the next version of this document.

## **4.6 Guest page headers and security**

- Strict Content-Security-Policy: only own domain and the assets CDN domain; no inline scripts outside a nonce.

- `X-Robots-Tag: noindex, nofollow` and the equivalent meta tag.

- `Referrer-Policy: no-referrer` so the tokenized URL does not leak to other sites when clicking a map or calendar link.

- `Cache-Control: no-store` on all guest API responses; the public entry page can be CDN-cached with a short TTL.

# **5. Template system**

Template size is the most important technical constraint of the frontend. General principle: **each guest downloads only the weight of their own template, and in stages.** From the start, template structure moves toward the no-code format in MVP §13.3: shared layout, design tokens, assets and schema.

## **5.1 Template package structure**

```
templates/
  <slug>/
    <version>/
      manifest.json     # metadata, tokens, schema ref, assets, budget, licenses
      schema.ts         # editable fields (zod)
      layout.tsx        # only if the template needs a custom layout
      assets/           # source files; uploaded with content hash at build
```

| **manifest field** | **Description** |
| --- | --- |
| slug, version | Template identifier and semantic version |
| tier, authorId | FREE or PREMIUM; designer for future revenue share |
| layout | One of the shared layouts or a custom layout |
| tokens | Colors, fonts, spacing, radii; converted to CSS variables |
| options | Palettes, font pairs and decoration sets allowed for level-2 customization |
| assets | List of assets with type, size and load stage (critical or lazy) |
| budget | Size cap for stage 0 and stage 2 |
| licenses | Source and license of every third-party font, image, icon and component |

## **5.2 Versioning and immutability**

- Every version folder is **frozen** after publishing. CI rejects any change to a published version by comparing hashes; a change means a new version.

- Code for old versions stays in the codebase because published cards are pinned to it (MVP §6.3). Each version is a separate chunk loaded only when needed.

- At build, assets go to Object Storage with content-hash-based keys and are served with `Cache-Control: immutable` and a one-year cache. An identical asset across versions is stored once.

- Deleting a version is only allowed when no published invitation is pinned to it.

## **5.3 Tokens and schema**

- Tokens become CSS variables on the card root; template components never have hard-coded colors or fonts.

- The zod schema of editable fields both builds the host's edit form and validates content at publish.

- The renderer is separate from the host panel, and the same code is used for host preview, preview-as-household and the guest page.

- In design, tokens are defined in Figma Variables with the same names so designers and code share a language.

## **5.4 Asset formats**

| **Type** | **Format** | **Rule** |
| --- | --- | --- |
| Image | AVIF and WebP in several sizes | Responsive variants generated with sharp; `srcset` and lazy load for lower page |
| Vector decoration | SVG | Optimized with SVGO and security-sanitized (scripts and event handlers removed) |
| Font | woff2 with subset | Only needed Persian glyphs and used weights; couple names vary so the full Persian alphabet is kept |
| Complex animation | dotLottie | Only for animations not possible with CSS and Motion (e.g. envelope); loaded after the click |
| Audio | Opus and AAC | Section 6 |
| Video | — | Not used in the MVP |

## **5.5 Budget and CI enforcement**

Each template declares its budget in its manifest. In CI, the template chunk's code size and the total assets of each stage are measured, and the build fails if the budget is exceeded. This rule becomes critical once external designers and the template marketplace arrive.

## **5.6 Development gallery and visual testing**

- The template gallery route is enabled only in development and staging, and shows each template with a set of sample data.

- Sample data includes extreme cases: long couple names, multi-part salutation, multi-line personal message, one or five sessions, no image, no parents' names.

- Playwright takes screenshots of every template × every sample dataset × three viewport widths (360, 390 and 768 px) and reports unintended changes.

# **6. Music**

Music comes from two sources: **the Payknameh music library** and **file upload by the host** with selection of a segment of the track. Pulling tracks from services like Spotify is not possible: their API does not provide full audio files, downloading violates their terms, and their embed is a third-party script on the guest page.

## **6.1 Music library**

- A collection of instrumental tracks in various moods (traditional, orchestral, gentle) selected and maintained by the team.

- Each track's source is one of: commissioned from a composer or musician under contract, or generated with AI under a valid commercial license.

- For AI tracks: commercial usage rights are granted only on a paid plan and via the service's official download path; the service's terms regarding sanctioned countries must be checked before producing. These tracks usually cannot be registered for exclusive copyright.

- Each track's license proof (contract, subscription receipt, official download file) is stored alongside its record.

- Library tracks are prepared through the same upload processing pipeline (section 6.2) for consistent output.

## **6.2 Upload and trimming**

| **Step** | **Details** |
| --- | --- |
| Upload | MP3, M4A, WAV or OGG up to about 20 MB; direct upload to Object Storage with a signed URL |
| Legal confirmation | "I have the right to use this file" checkbox before saving; time, user and text version recorded |
| Validation | Real content checked with ffprobe in the worker; extension and browser Content-Type are not trusted |
| Segment selection | wavesurfer.js waveform; host picks the start point and a fixed 60–90 second window is cut |
| Processing | Trim, fade in and fade out, loudness normalization with loudnorm, strip metadata and cover art |
| Output | Opus and AAC (M4A) at about 96 kbps; about 1 MB for 90 seconds |
| Cleanup | The raw file is kept at most a few days after successful processing, then deleted |
| Preview | The host listens to the processed version exactly as the guest will hear it |

## **6.3 Playback for the guest**

- Playback starts exactly after the "Open invitation" click; that interaction satisfies browsers' autoplay restrictions.

- A mute/unmute button is always available.

- The audio file is part of the post-click load, with an unguessable, noindex URL; it is never in the initial HTML.

## **6.4 Legal requirements in the system**

- Record uploader consent (ConsentRecord) with the version of the terms text.

- "Takedown due to complaint" capability for the team from the internal panel; the file is immediately made unavailable and the host is notified.

- A liability clause for uploaded content in the terms of use; final text after legal review.

Whether custom song upload and the library are free or paid is a product decision. Technically both sit behind the entitlement system (Entitlement, section 9) so changing that decision requires no code change.

# **7. Backend**

## **7.1 Layers and actor**

Layers and their dependency direction are given in section 2.4.

Every service function receives an explicit **actor** (host, guest with token, team member, system). Access checks happen inside the service, not in the entrypoint layer; so the future AI agent and any new entrypoint automatically get the same rules.

## **7.2 Database rules**

- IDs are UUIDv7; no internal ID is used in the public guest URL.

- All times are `timestamptz`; monetary amounts are `bigint` in rials.

- Important rules are guaranteed by database constraints as well as code: uniqueness of (householdId, sessionId), consistency of status and attendeeCount via CHECK, uniqueness of the user's phoneE164.

- Saving a response and its RSVPEvent history row happen in one transaction.

- Soft delete via `deletedAt` or `removedAt` columns per the MVP document; default queries exclude deleted rows.

- Migrations are generated with drizzle-kit and their SQL is reviewed before merge; forward-only and compatible with the previous code version (expand/contract pattern).

- Entities edited by several people or tabs concurrently (Household, Session, Invitation draft) have a `version` column and are updated with optimistic locking.

## **7.3 Authentication**

| **Topic** | **Rule** |
| --- | --- |
| OTP code | 6 cryptographically random digits; HMAC stored; valid 2 minutes; max 5 attempts; single use |
| Sending OTP | Via the SMS vendor's template (verify) service; rate limit per phone number and IP |
| Session | 256-bit random token, stored as hash, `httpOnly`, `Secure` and `SameSite=Lax` cookie, 30-day sliding expiry |
| Logout | Revoke session in the DB; option to log out of all devices |
| Number normalization | Convert all inputs (0912, +98912, Persian and Arabic digits) to E.164 in the domain layer |

## **7.4 Guest token**

- 128 cryptographically random bits, base62 encoded (about 22 characters).

- Lookup via HMAC-SHA256 of the token with a server-side pepper.

- Encrypted copy with AES-256-GCM for showing the link to the host again; each encryption carries a key ID (keyId) so keys can be rotated without invalidating links.

- Keys are kept only in environment variables, separate from database backups.

## **7.5 Queue and background jobs**

The queue is implemented with pg-boss on the same PostgreSQL; every job is idempotent and protected from duplicate runs with a unique key.

| **Job** | **When it runs** | **Description** |
| --- | --- | --- |
| sms.invite | On host request | Bulk send with rate control and retry; records InvitationDelivery |
| sms.status | Webhook or periodic | Update DELIVERED and FAILED and refund credit for failed SMS |
| asset.image | After upload | Validation, metadata removal, size generation |
| asset.audio | After upload | Processing pipeline of section 6.2 |
| import.households | After column mapping is confirmed | Create CANDIDATE households in a transaction |
| export.excel | On host request | Build the file and a temporary download link |
| payment.reconcile | Periodic (after MVP) | Recheck pending payments |
| metrics.rollup | Daily | Aggregate metrics into a summary table |
| cleanup | Daily | Expired OTPs, raw files, temporary download links |
| event.lifecycle | Daily | Apply retention and archival policy (section 15) |

## **7.6 Rate limiting**

Rate limiting is implemented in a PostgreSQL table with a time window. Redis is added only under real pressure.

| **Route** | **Limit key** |
| --- | --- |
| OTP request | Phone number and IP, separately |
| OTP verify | Phone number and challenge |
| Opening the invitation and submitting a response | Token and IP |
| File upload | User and event |
| Sending invitation SMS | Event (daily cap) |

## **7.7 Files**

- Direct browser upload to Object Storage with a signed URL and size limit; the file is "processing" until worker validation completes.

- Storage quota per event; final number in open decisions.

- Private files (raw files, Excel exports) are accessible only via short-lived signed links.

- Deleting an asset used in published content is deferred until the next publish.

## **7.8 SMS**

- `SmsProvider` interface with operations for sending OTP, sending invitations and fetching status; `ConsoleSmsProvider` for local development.

- Each send has an idempotency key so retries don't cause duplicate SMS.

- The number of message segments and the actual cost of each send are recorded; the basis of the SMS margin metric (section 10).

- A preview of SMS length and segment count is shown to the host before bulk sending.

## **7.9 Maps and link parsing**

- Location picking with the Neshan web SDK by dropping a pin.

- Parsing pasted Neshan, Balad and Google Maps links; short links are resolved server-side by following redirects.

- The link parser only requests an allowlist of domains, with a timeout and a redirect cap, so SSRF attacks are not possible.

## **7.10 Time and calendar**

- All times stored as standard timestamps; timezone on Event with default `Asia/Tehran`.

- Jalali conversion and display with date-fns-jalali; a Jalali date string is never stored.

- Iran has had no daylight saving time since 1401 (2022), but the offset is never computed by hand; the standard timezone database is always used.

## **7.11 Persian text normalization**

- A normalization function in the domain layer: unify Arabic "ي" with Persian "ی" and "ك" with "ک", unify the zero-width non-joiner (half-space), remove diacritics and extra spaces.

- A normalized search column is kept for names; search and duplicate household detection run on it.

- The `pg_trgm` extension for fuzzy search and suggesting similar households.

- The user's original text is displayed exactly as entered; normalization is only for search and comparison.

## **7.12 Excel import and export**

- **Import:** upload an xlsx or csv file, parse in the worker, show column mapping (name, salutation, number, headcount, tree branch) and a row preview, then create households as CANDIDATE after host confirmation.

- Rows suspected to be duplicates (by number or normalized name) are shown to the host before saving.

- **Export:** full household list, and a response report per session for the venue and catering.

- Library: exceljs for both directions.

- Picking from phone contacts with the Contact Picker API as a helper path (only supported on Chrome for Android).

# **8. Data model: changes relative to the MVP document**

This table lists only new entities and changes. All other entities are as in MVP §5.

| **Entity** | **Status** | **Key fields** | **Description** |
| --- | --- | --- | --- |
| EventAsset | Replaces EventImage | eventId, kind, storageKey, mime, size, width, height, durationMs, trimStartMs, processingStatus, takenDownAt | kind: IMAGE or AUDIO |
| MusicTrack | New | title, mood, storageKeys, durationMs, licenseSource, licenseRef, tier, active | Payknameh music library |
| Event | Changed | archivedAt, purgeScheduledAt | Active/held state is computed; only archival is stored |
| Editable entities | Changed | version | Optimistic locking |
| Household | Changed | searchName | Normalized name for search |
| User | Changed | staffRole | NONE, SUPPORT or ADMIN for the team panel |
| Session (authentication) | New | userId, tokenHash, expiresAt, revokedAt | Table name in code: AuthSession, to distinguish from the event Session |
| ConsentRecord | New | userId, kind, textVersion, createdAt | Upload consent, acceptance of terms of use |
| AuditLog | New | actorType, actorId, action, entityType, entityId, eventId, reason, createdAt | Append-only; mandatory for team access |
| AnalyticsEvent | New | name, eventId, properties, occurredAt | No personal data |
| MetricDaily | New | date, metric, dimension, value | Daily metrics summary |
| ImportJob | New | eventId, assetId, status, mapping, summary | Excel import |
| OnboardingState | New | userId, eventId, dismissedAt | Only dismissing the guide is stored |
| Billing entities | New (ready for after MVP) | Section 9 | Product, Order, OrderItem, Payment, Invoice, Entitlement, SmsCreditLedger |

# **9. Billing and payment (technical readiness)**

Payment is not implemented in the MVP, but the data model and rules are defined now so adding it needs no redesign. The MVP document's principles stand: one-time payment per event, and the core loop always free.

## **9.1 Data model**

| **Entity** | **Key fields** | **Rule** |
| --- | --- | --- |
| Product | code, title, type, priceRials, active | type: PLAN, ADDON (premium template, music, branding removal) or SMS_PACK |
| Order | organizationId, eventId, status, subtotalRials, taxRials, totalRials, idempotencyKey | States: PENDING, PAID, FAILED, CANCELED, REFUNDED |
| OrderItem | orderId, productId, quantity, unitPriceRials | Price is snapshotted at order time |
| Payment | orderId, provider, providerRef, amountRials, status, verifiedAt, rawResponse | The gateway's raw response is kept for dispute handling |
| Invoice | number, orderId, issuedAt, buyer, lines, taxRate, totalRials, pdfKey | Immutable; correction only via a credit note |
| Entitlement | eventId, feature, sourceOrderItemId, grantedAt, revokedAt | Single source for "this event has access to this feature" |
| SmsCreditLedger | organizationId, delta, reason, referenceId, createdAt | Append-only; balance computed as the sum of rows |

## **9.2 Payment flow**

1. Create the Order with an idempotency key and snapshotted prices.

2. Request payment from PaymentProvider and redirect the user to the gateway.

3. On return, **server-side verification with the gateway API**; callback URL parameters are never trusted.

4. In one transaction: Payment successful, Order paid, create Entitlements or SMS credit.

5. Issue the invoice with a sequential number and build the PDF in the worker.

6. A periodic reconcile job for payments where the user did not return to the site after paying.

## **9.3 Rules**

- All amounts stored in rials as integers; display in tomans only in the UI.

- The VAT rate is kept in settings with an effective date, not hard-coded.

- Invoice numbers are sequential with no gaps, generated by a database sequence.

- All paid-feature checks are server-side via Entitlement; a premium template cannot be published without an entitlement.

- SMS credit for FAILED sends is refunded automatically.

- Non-technical prerequisites (eNamad e-trust seal, gateway contract, official invoice requirements) are reviewed with a financial and legal advisor before implementation.

# **10. Metrics and analytics**

## **10.1 Principles**

- The guest page and host panel have no third-party analytics tools. Metrics are built from the system's own data and the AnalyticsEvent table.

- Self-hosted Umami only on the marketing site.

- No names, phone numbers or personal text are stored in analytics events; only IDs and counts.

## **10.2 Logged events**

| **Event** | **When logged** |
| --- | --- |
| host.signed_up | First OTP verification |
| event.created | Event creation |
| onboarding.step_completed | First time a checklist step is completed |
| invitation.published | Every publish |
| delivery.sent / delivery.failed | SMS sent or "sent" mark |
| guest.first_opened | First open by each household (from firstViewedAt) |
| rsvp.submitted | Every response, with actorType |
| order.paid | Successful payment (after MVP) |
| badge.clicked | Click on "Made with Payknameh" on a card; template slug only, no token |

## **10.3 Product metrics**

- **Response completion rate** (the MVP document's primary metric): responding households divided by invited, overall and per session.

- **Response rate without follow-up:** share of responses with actorType GUEST, alongside interview data.

- **Activation funnel:** signup → event created → first session → first invite → publish → first send → first guest response.

- **Time to response:** interval from sending to first open and to response.

## **10.4 Business metrics**

- **Conversion rate:** share of events with at least one purchase.

- **Revenue per event** and mix of products sold.

- **SMS margin:** credit sales minus the recorded actual cost of sends.

- **Growth from the branding channel:** signups that came from the "Made with Payknameh" link (ref parameter with no personal data).

- **Infrastructure cost per event:** from the vendor's report, monthly.

The daily metrics.rollup job aggregates these metrics into MetricDaily, and the team panel dashboard reads only from this table.

# **11. Internal team panel**

The first events run with direct team support (MVP §12), so the internal panel is needed from the start. Its principle: **enough access for support, without seeing family data by default.**

- Separate route (`(staff)`) with SUPPORT and ADMIN roles; login with the same OTP and IP restriction if needed.

- Search users and events by phone number; show a count-only summary (number of sessions, households, responses, delivery states) without names.

- Viewing an event's personal details only via an explicit action with a recorded reason; every access is logged in AuditLog.

- Manage the music library and publish template versions.

- Asset takedown due to complaint, manual entitlement grant (logged in AuditLog), and viewing the SMS delivery log.

- Dashboard of the section 10 metrics.

- Impersonation (logging in as the host) is not implemented; support is done via a read-only view.

# **12. Security and privacy**

This section turns the requirements of MVP §8 into implementation rules.

| **Area** | **Rule** |
| --- | --- |
| Access | All checks inside services and actor-based; no route accesses the database without going through a service |
| Input | Validate all inputs with zod at the system boundary (action, route, job) |
| Output | React's default escaping; `dangerouslySetInnerHTML` only for server-side sanitized SVG |
| CSRF | Origin check in Server Actions and POST routes, plus `SameSite=Lax` |
| Headers | CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, restricted `Permissions-Policy` |
| Upload | Check real file content, size and dimension caps, random file name, SVG sanitization, strip image and audio metadata |
| SSRF | Any server request to a user-supplied URL only to allowed domains, with timeout |
| Secrets | Only in the vendor's environment variables; never in the code repo; encryption keys rotatable via keyId |
| Logs | Phone numbers masked; no names, personal messages, tokens or OTP codes in logs |
| Database | Least-privilege DB user for the app; separate user for migrations |
| Dependencies | Automatic updates with Renovate and vulnerability scanning in CI |
| Backup | Encrypted and stored with a second vendor |

# **13. Infrastructure and DevOps**

## **13.1 Hosting**

| **Component** | **Start (Liara)** | **Migration option** |
| --- | --- | --- |
| Web app | Docker app or Next.js platform | ArvanCloud cloud server with Docker Compose |
| Worker | Separate Docker app | Separate container on the same server |
| Database | Managed PostgreSQL | ArvanCloud DBaaS or self-hosted PostgreSQL |
| File storage | Liara Object Storage | ArvanCloud Object Storage (both S3-compatible) |
| CDN | Vendor's CDN | ArvanCloud CDN |

Final selection criteria: stability, Docker and PostgreSQL support, S3-compatible API, and cost. Because everything is built on standards, moving between vendors is just a config change and data migration.

## **13.2 Environments**

| **Environment** | **Purpose** | **Characteristics** |
| --- | --- | --- |
| Local | Development | Docker Compose with PostgreSQL and MinIO; ConsoleSmsProvider; sample data via seed |
| staging | Pre-release testing | Infrastructure similar to production with a separate DB; SMS only to allowed team numbers; template gallery enabled |
| production | Real users | Release only via tag; no direct developer access to the DB |

## **13.3 CI/CD**

- Repo on GitHub; every Pull Request requires review.

- CI steps: install with lockfile, lint, typecheck, unit and integration tests (with PostgreSQL in Docker), build, size budget, Playwright, Lighthouse CI.

- Every merge to main is automatically deployed to staging; production only via version tag.

- Migration runs as a separate step before deploying new code.

- Node and pnpm versions are pinned in the project.

## **13.4 Supply chain in Iran**

- Docker Hub blocks requests from Iranian IPs; base images are pulled from an Iranian vendor's registry or a mirror.

- If the public npm registry is disrupted, a configured internal mirror must be ready.

- Tools that download binaries from foreign servers at build or run time (like the Prisma engine in older versions) are not chosen; one of the reasons for choosing Drizzle.

- Foreign SaaS services with sanctions restrictions (like cloud Sentry) are replaced with self-hosted equivalents.

## **13.5 Backup and restore**

- Daily automatic backups by the database vendor.

- Encrypted daily or weekly pg_dump to a second vendor's Object Storage.

- Versioning or replication on Object Storage for assets.

- Full restore drill every three months on a separate environment; a backup whose restore hasn't been tested doesn't count as a backup.

## **13.6 Monitoring and logging**

- Structured JSON logs with pino and a request ID in every log.

- Error tracking with self-hosted GlitchTip (Sentry SDK-compatible).

- `/health` route for the app and worker (DB connection, queue lag).

- Uptime monitoring of the guest page, host panel and worker; alerts to the team's messenger channel.

- Alerts for a high FAILED rate on SMS and lagging queues.

## **13.7 Load and scale**

- Peak load comes right after a bulk SMS send: hundreds of opens within a few minutes.

- The public entry page has no personal data and is CDN-cached with a short TTL; server load comes only from personal POST requests.

- Connection pooling for PostgreSQL.

- Bulk SMS is sent with rate control in the worker, both to respect vendor limits and to spread out the load of opens.

- Load testing with k6 before launch, with a scenario of simultaneous card opens for a large event.

# **14. Testing and quality**

## **14.1 Test layers**

| **Layer** | **Tool** | **Coverage** |
| --- | --- | --- |
| Unit | Vitest | Domain rules: response, deadline, inconsistency, invitation state, phone and text normalization, tree counts |
| Integration | Vitest with real PostgreSQL in Docker | Services, access, transactions, constraints, queue |
| End-to-end | Playwright | MVP §11.1 acceptance test on staging |
| Visual | Playwright (screenshots) | Templates with extreme sample data |
| Performance | Lighthouse CI and size-limit | Budgets of sections 4.5 and 5.5 |
| Load | k6 | Bulk send and simultaneous open scenario |

All required tests in MVP §11.2 are implemented at the integration or end-to-end layer. Tests added by this document: Excel import and duplicate detection, audio processing pipeline, template version immutability, idempotency of payment and SMS sending, and Entitlement checks.

## **14.2 Device and browser matrix**

| **Environment** | **Priority** |
| --- | --- |
| Chrome Android, Safari iOS | Required; automated and manual |
| Telegram in-app browser (Android and iOS) | Required; manual |
| In-app browsers of Bale, Eitaa, Rubika, WhatsApp, Instagram | Required; manual before every new template release |
| Samsung Internet, Firefox Android | Important |
| Desktop browsers | Required for host panel; important for guest page |
| Devices | At least one real mid-range Android phone and one older iPhone |

## **14.3 Code quality**

- TypeScript with full `strict`; `any` forbidden by lint rule.

- ESLint, Prettier and the import restriction rule between layers.

- Test coverage is mandatory for the `domain` layer; for the rest, risk-based.

- Every change to the data model, templates or domain rules comes with an update to this document or the MVP document.

# **15. Event lifecycle and data retention**

| **State** | **How determined** | **Behavior** |
| --- | --- | --- |
| Draft | Computed: invitation not published | Links not yet given to guests |
| Active | Computed: published and last session not yet held | Normal behavior |
| Held | Computed: end of last session has passed | Guest page shows a thank-you state; response form closed; panel read-only except export |
| Archived | Stored: archivedAt | After the retention period; personal data deleted and only anonymous stats kept |

- The retention period after the event (initial proposal: 90 days) is in open decisions. The host is notified before archival so they can export.

- The host can delete the event immediately and completely at any time; deletion includes Object Storage files and is performed by the worker.

- Backups expire on their own cycle; backup retention is stated in the privacy policy.

- Invoices and financial records are retained per legal requirements independently of event deletion, without guest data.

# **16. Technical implementation order**

The MVP document's phases are kept. This table specifies each phase's technical work, plus items added by this document.

| **Phase** | **Technical work** |
| --- | --- |
| 0. Infrastructure | Repo, folder structure, lint and typecheck, local Docker Compose, CI, staging on Liara, logging and error tracking |
| 1. Foundation | Initial Drizzle schema, SmsProvider and ConsoleSmsProvider, OTP and session, rate limiting, User, Organization, Event and EventMember, access layer, AuditLog |
| 2. Event structure | Session with Jalali date, location picking with Neshan and link parsing, RSVP deadline, optimistic locking |
| 3. Guests | Tree and family skeleton, Household and members, normalization and search, invitation state, HouseholdSession and capacity, tokens, **Excel import** |
| 4. Invitation | Template system and manifest, renderer, gallery and visual testing, EventAsset and image processing, **music library and audio upload**, draft and publish, previews |
| 5. Guest PWA | Public page and staged loading, response, calendar, map, **in-app browser compatibility**, offline cache, security headers, performance budget |
| 6. Response dashboard | Session stats, host-entered responses, history, inconsistent tag, **Excel export** |
| 7. Delivery | SMS send queue, delivery status, copy and share link |
| 8. Launch readiness | **Onboarding**, AnalyticsEvent and metrics dashboard, **internal team panel**, data retention policy, load testing, security review, device matrix, legal documents |
| After MVP | Billing and payment (section 9), level-2 customization, AI agent |

# **17. Open technical decisions**

| **Topic** | **Options** | **Decision time** |
| --- | --- | --- |
| Final hosting provider | Liara or ArvanCloud | Phase 0 |
| SMS provider | Kavenegar, sms.ir, Ghasedak, Melipayamak; check link restrictions on sender number | Phase 1 |
| Short `.ir` domain | Selection and registration | Phase 1 |
| Map API key | Neshan (and Balad if needed) | Phase 2 |
| Upload size cap and per-event quota | Based on storage cost | Phase 4 |
| Legal source of music | Commission a composer, AI with legal subscription, or a mix | Phase 4 |
| Final size and performance budget numbers | After testing on real devices | Phase 5 |
| Data retention period after the event | Proposed 90 days | Phase 8 |
| Two-family collaboration UI (EventMember) | In MVP or right after | After the first real events |
| Payment gateway and invoice requirements | With financial and legal advisor | Before implementing payment |
