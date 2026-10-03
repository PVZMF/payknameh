# Payknameh (پیک‌نامه) — Claude Code guide

Persian-first digital event platform. MVP = Iranian weddings. Two surfaces: **host web app** (build/manage event) + **guest PWA** (personal invitation, RSVP).

## Source of truth (read before any non-trivial task)
| Doc | Decides | Precedence |
|---|---|---|
| `docs/specs/MVP-Final-Decisions.md` (v1.2) | WHAT to build, domain rules (§6) | domain rules |
| `docs/specs/Technical-Architecture-v1_1.md` | tools, architecture, infra | technical decisions |
| `docs/specs/Coding-Standards-v1_0.md` | repo, style, git, release, docs | process rules |
| `docs/specs/Business-Marketing-Logs.md` | segments, finance log, analytics events | context only |

Conflict → domain from MVP doc, tech from Architecture doc, process from Standards doc.
ORM is **Drizzle** (Architecture doc settles MVP §15 open item).
Unsure about a rule → grep the spec, cite section (e.g. `MVP §6.4`). Never invent domain rules; ask.

## Stack
Next.js App Router + strict TypeScript (no `any`, `noUncheckedIndexedAccess`) · PostgreSQL + Drizzle · pg-boss worker (same codebase, `worker.ts`) · Tailwind v4 + shadcn/ui, full RTL, self-hosted Vazirmatn · react-hook-form + zod · date-fns-jalali + shadcn Calendar (Persian) · dnd-kit · TanStack Table/Virtual · Motion · Serwist (guest routes only) · lucide-react · pino · Vitest + Playwright · Docker, S3-compatible storage (MinIO local) · pnpm.

## Architecture (modular monolith)
```
src/
  domain/<module>/        # rules, entities, zod schemas — NO framework/db imports
  server/
    services/<module>/    # use cases, actor access checks, transactions; index.ts = public API
    db/                   # drizzle schema, migrations, queries
    jobs/                 # pg-boss handlers (name: module.verb)
    providers/            # sms, maps, payment, storage adapters (interfaces)
  app/ (marketing) (host) (guest) (staff) api/
  renderer/  ui/  strings/<module>.ts  env.ts
templates/<slug>/<version>/   # frozen after publish
tests/ e2e/ visual/ load/
worker.ts
```
Dependency direction: entrypoints → services → db/providers → domain. Domain depends on nothing.
Cross-module: import only from other module's `services/<module>/index.ts`. No deep imports, no touching another module's tables.
Client code never imports `server/`; server files start with `import "server-only"`.
External services only via adapter (`SmsProvider`, `MapProvider`, `PaymentProvider`). Local SMS = `ConsoleSmsProvider`.

Modules (fixed list; also commit scopes): `auth org event guest invitation template music rsvp delivery billing analytics staff`. Shared scopes: `ui infra ci deps docs`.

Domains: main (marketing, indexable) · `app.` subdomain (host + staff, session cookie here only) · short `.ir` domain (only `/i/<token>` + guest API, no host cookie, noindex).

## Domain principles (MVP §2) — never violate
- **Event** = container. No operational date/time/place on Event.
- **Session** owns date, time, venue, address, coords, RSVP deadline.
- **Household** = invite unit, one link each. `displayName` free text, not derived from surname.
- **HouseholdSession** = response unit (`maxAttendees`, answer).
- Overall status is **computed**, never stored. No answer = pending; never create PENDING rows.
- Household invite state: candidate / invited / excluded. Link + card only for invited.
- Card rendered on open (template + published content + household data). No per-household pages.
- RSVP history append-only in `RSVPEvent` (guest and host changes).
- Published things immutable: template versions, assets, published content, invoices, RSVP history.
- Server is source of truth for access, deadlines, caps, paid entitlements.

## Code rules
- Naming: files kebab-case · components PascalCase · fns camelCase verbs · types PascalCase no `I` · consts UPPER_SNAKE · `householdSchema` · one service file per use case (`publish-invitation.ts`) · tables snake_case plural · analytics `module_verb_past` · env `GROUP_NAME`.
- Code identifiers English; use MVP data-model terms exactly, no synonyms.
- Parse every boundary input with zod (actions, routes, jobs, webhooks, Excel). Trust types inside.
- Expected errors → typed result with stable code (`RSVP_DEADLINE_PASSED`), not throw. Throw only unexpected.
- Persian error text built from code in `strings/`. Never show technical messages to users.
- No Persian strings in components → `src/strings/<module>.ts`.
- Logical CSS only (`ms-* pe-* start-*`), no left/right. Numbers via shared Persian-digit formatter.
- Named exports except Next.js page/layout. Fn ≲50 lines, file ≲300 lines. Aliases `@/domain @/server @/ui`.
- Logging: pino only, no `console.log`. Mask personal data.
- Comments explain why; cite spec: `// MVP §6.4: deadline applies to guests only.` TODO needs issue: `// TODO(#123): …`. TSDoc on public domain/service fns.
- Env vars validated in `src/env.ts` (zod); behavior keyed on `APP_ENV`, never `NODE_ENV`. Update `.env.example` same PR.
- Guest page: no third-party scripts/fonts/analytics, no WebGL, Motion loaded after interaction, size budgets enforced in CI.
- New shadcn/effect-library component → log license in `docs/guides/third-party.md`.

## Git
Conventional Commits: `feat(rsvp): allow host override after deadline` — English, imperative, <72 chars, no period. Body = why.
Branches: `feat|fix|refactor/<issue>-<short-name>` off `develop`. PR <400 lines, squash merge, PR title = commit format.
Migrations must stay compatible with previous code version (run before deploy); breaking change split across releases.

## Commands (fill in after scaffold)
```
pnpm dev | pnpm build | pnpm lint | pnpm typecheck | pnpm test | pnpm test:e2e
pnpm db:generate | pnpm db:migrate | pnpm db:seed | pnpm worker
docker compose up -d   # postgres + minio
```

## Build order (MVP §10) — no later phase before earlier works end-to-end
1. Foundation: scaffold, DB, SmsProvider + Console, OTP login, User/Organization/Event, access layer
2. Event structure: Event + Session, Jalali date picker, venue + coords, RSVP deadline
3. Guests: group tree + family skeleton, Household + members, candidate/invite state, personal message, tree view, HouseholdSession + caps, hall capacity, secure tokens
4. Invitation: one premium versioned Persian template, renderer, draft/publish pinned to template version, host preview + preview-as-household, short link
5. Guest PWA: public entry page, client-side personal content, sessions, map, countdown, RSVP, deadline, calendar, offline shell
6. RSVP dashboard: per-session stats, expected headcount, host-entered responses, history, "inconsistent" tag
7. Delivery: SMS invite, delivery status, copy link, native share, "sent" mark

Acceptance tests: `MVP §11`. Check them before calling a phase done.

## Working style
- Before coding a phase: read relevant spec sections, propose plan + file list, wait for OK.
- Small steps, each ends green: `typecheck`, `lint`, tests.
- Domain logic gets Vitest unit tests first.
- Open decisions (SMS provider, hosting, short domain, map key): code against interface, don't pick a vendor.
