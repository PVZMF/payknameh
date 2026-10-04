**Payknameh — Coding, Versioning and Documentation Standards**

Mehr 1405 (October 2026) · Mohamad

# **0. Document details**

This document sets the mandatory rules for writing, versioning, releasing and documenting Payknameh code. Any Pull Request that does not comply with these rules is not merged.

| **Attribute** | **Value** |
| --- | --- |
| Version | 1.0 |
| Status | Draft for team review |
| Reference documents | MVP Final Decisions Document v1.2; Architecture and Technical Decisions Document v1.1 |
| Scope | Repository, code style, environments, branches, versioning, commits and PRs, migrations, documentation, releases |

**Position of this document.** The MVP document says what is built, the technical document says with which tools and architecture, and this document says how code is written, recorded and released day to day. In a conflict, domain rules come from the MVP document, technical decisions from the technical document, and process rules from this document.

**Change relative to the technical document.** Section 13.3 of the technical document had two stages (main → staging, tag → production). This document adds a development environment and a develop branch; the technical document must be aligned with this change in version 1.2.

**Version history**

| **Version** | **Date** | **Changes** |
| --- | --- | --- |
| 1.0 | Mehr 1405 | First version: repo structure, code rules, three environments, branches, versioning, commits and PRs, migrations, documentation system, releases and checklists |

# **1. Repository structure**

One GitHub repository for the web app, worker, templates and technical docs. The src structure is the same as section 2.4 of the technical document; this section only adds root-level folders and the location of docs.

```
payknameh/
  .github/
    workflows/           # ci.yml, deploy-dev.yml, deploy-staging.yml, deploy-prod.yml
    PULL_REQUEST_TEMPLATE.md
    CODEOWNERS
  docs/                  # all technical docs (section 8)
    README.md            # docs index
    modules/             # one folder per domain module
    adr/                 # architecture decision records
    runbooks/            # how to operate: deploy, rollback, restore
    guides/              # setup, conventions, how-to for developers
    releases/            # release notes per version
  src/
    domain/<module>/     # rules, entities, zod schemas
    server/
      services/<module>/
      db/                # schema, migrations, queries
      jobs/
      providers/
    app/                 # (marketing) (host) (guest) (staff) api
    renderer/
    ui/
    strings/
    env.ts               # validated environment variables
  templates/<slug>/
    CHANGELOG.md         # template change log (outside frozen versions)
    <version>/           # frozen after publish
  tests/
    e2e/                 # Playwright
    visual/
    load/                # k6
  scripts/               # seed, one-off maintenance (reviewed like code)
  docker/
  worker.ts
  CHANGELOG.md           # generated, app-level
  .env.example           # every variable, no real values
  package.json · pnpm-lock.yaml · .nvmrc
```

**Modules.** The list of domain modules is fixed and each name is the same in the folder, commit scope, docs folder and PR label:

| **Module** | **Content** |
| --- | --- |
| auth | OTP, session, rate limiting |
| org | User, Organization, EventMember, access |
| event | Event, session, venue, deadline |
| guest | Tree, household, members, invitation state, Excel import |
| invitation | Invitation, draft, publish, EventAsset |
| template | Template system, renderer, manifest |
| music | Music library and audio upload |
| rsvp | Response, history, dashboard |
| delivery | SMS and link sending |
| billing | Invoicing and payment (after MVP) |
| analytics | Internal events and metrics |
| staff | Internal team panel |

A new module is added only via an ADR (section 8). Shared work gets the scope ui, infra, ci, deps or docs.

# **2. Coding rules**

Every rule a tool can check is enforced in lint or CI; the rest are checked in PR review.

**Naming**

| **Item** | **Rule** | **Example** |
| --- | --- | --- |
| File and folder | kebab-case | household-session.ts |
| React component | PascalCase in a kebab-case file | guest-tree.tsx → GuestTree |
| Function and variable | camelCase, verb for functions | computeInviteStatus |
| Type and interface | PascalCase, no I prefix | RsvpResponse |
| Global constant | UPPER_SNAKE_CASE | MAX_UPLOAD_BYTES |
| zod schema | entity name + Schema | householdSchema |
| Service | verb + subject, one file per use case | publish-invitation.ts |
| Job | module.verb | delivery.send-sms |
| DB table and column | snake_case, plural for tables | household_members |
| Analytics event | module_verb_past | invitation_published |
| Environment variable | UPPER_SNAKE_CASE with group prefix | SMS_PROVIDER, S3_BUCKET |

Names in code are in English. Domain terms are exactly as in the MVP data model (Household, Session, Invitation); no synonyms are invented.

**TypeScript**

- Full strict, noUncheckedIndexedAccess on; any, @ts-ignore and unjustified `as` forbidden by lint. @ts-expect-error only with an explanation.

- Input at every boundary (action, route, job, webhook, Excel file) is parsed with zod; inside layers, types are trusted.

- Default exports only where Next.js requires them (page, layout); everything else uses named exports.

- Short functions, at most about 50 lines; files at most about 300 lines. More than that signals a split.

**Layers and imports**

- Dependency direction is the table in section 2.4 of the technical document, checked in CI with eslint-plugin-boundaries.

- Modules import only from another module's service index.ts; deep imports into another module's internal files are forbidden.

- Paths use aliases (@/domain, @/server, @/ui); ../../.. more than two levels is forbidden.

- Client code never imports server/; server files start with import "server-only".

**Errors**

- Services return a typed result for expected errors (deadline passed, capacity full, no access), not throw. Each error has a stable code: RSVP_DEADLINE_PASSED.

- Throw only for unexpected errors; these go to GlitchTip.

- Persian error text is built from the code in strings; technical error messages are never shown to the user.

**Logging**

- pino only; console.log forbidden by lint (except in scripts).

- Every log: level, fixed English message, request ID, module. Personal data is masked or removed per section 12 of the technical document.

**UI, RTL and strings**

- No Persian strings are written inside components; all go in src/strings/<module>.ts.

- left/right forbidden, logical properties only (lint rule).

- Numbers only through the shared Persian-digit formatting function.

- Any new shadcn/ui component or component copied from an effect library is recorded with its license in docs/guides/third-party.md.

**Formatting and tooling**

- Prettier is the final word on formatting; style debates in review are forbidden.

- lint-staged and husky before commit: Prettier, ESLint on changed files, commit message check.

- Node version pinned in .nvmrc and pnpm version in packageManager.

**Code comments**

- Comments say "why", not "what". Reference document rules by section number: // MVP §6.4: deadline applies to guests only.

- TODO only with an issue number: // TODO(#123): …. A TODO without an issue is rejected by lint.

- Public domain functions and services have short TSDoc: purpose, preconditions, possible errors.

# **3. Environments**

We have three fully separate cloud environments, plus each developer's local environment. No two environments share a database, bucket, key or cookie.

| **Attribute** | **local** | **development** | **staging** | **production** |
| --- | --- | --- | --- | --- |
| Purpose | Daily work | Integrating team work | Acceptance testing, production-like | Real users |
| Code source | Personal branch | develop branch, automatic | main branch, automatic | Version tag only, with manual approval |
| Domain | localhost | dev. subdomain of the main domain | staging. subdomain of the main domain | Main domain, app and short domain |
| Database | PostgreSQL in Docker | Separate, resettable | Separate, stable | Separate, backed up and encrypted |
| File storage | MinIO | Separate bucket | Separate bucket | Separate bucket with replication |
| Data | seed | seed, weekly rebuild allowed | seed + team test data | Real data only |
| SMS | ConsoleSmsProvider | ConsoleSmsProvider or sending only to team numbers | Allowlisted numbers only | Real vendor |
| Payment (after MVP) | mock | Gateway sandbox | Gateway sandbox | Real gateway |
| Search engine indexing | — | noindex + Basic Auth | noindex + Basic Auth | Marketing site only |
| Developer DB access | Full | Full | Read-only | None; only via runbook |
| Logs and errors | Console | GlitchTip, dev project | GlitchTip, staging project | GlitchTip, prod project + alerts |

**Environment variables**

- All variables are defined with zod in src/env.ts and validated at app and worker startup; a missing variable means the app does not start.

- The APP_ENV variable with values local | development | staging | production determines environment behavior. NODE_ENV is production in all three cloud environments and is not used for decisions.

- .env.example contains all variables with sample values and is updated in the same PR that adds a variable.

- Secrets only in the vendor's environment settings and GitHub Environments; each environment has its own keys. Copying production keys into another environment is forbidden.

**Data rules across environments**

- Production data is never copied to another environment. To reproduce a problem, use anonymized data via a dedicated script and only with the tech lead's approval.

- The seed is in the repo and is identical for development and staging: one complete event with sessions, a guest tree and sample responses.

- Feature flags (if needed) are read from an environment variable or a settings table, not from conditions on the environment name in code.

# **4. Git branches and code flow**

Each permanent branch is tied to exactly one environment. Code only moves forward, and no environment receives code that hasn't passed through the previous one, except for hotfixes.

production is the only environment without automatic deployment; a back-merge after each release keeps develop in sync with main.

| **Branch** | **From** | **To** | **Environment** | **Lifetime** |
| --- | --- | --- | --- | --- |
| feat/* · fix/* · refactor/* | develop | develop | local | Until merge, at most about three days |
| develop | — | main | development | Permanent, protected |
| main | develop | tag | staging | Permanent, protected |
| hotfix/* | main | main | staging then production | Same day |
| tag vX.Y.Z | main | — | production | Permanent, immutable |

- Merges into develop and main are squash only; back-merges and release PRs use merge commits to preserve history.

- Tags are created only by release-please; manual tags and deleting or moving tags are forbidden.

# **5. Versioning**

Five things have versions and each has its own rule. The app version is computed from commit messages, not manually.

| **What** | **Format** | **Who bumps it** | **Where recorded** |
| --- | --- | --- | --- |
| App (web + worker) | SemVer: MAJOR.MINOR.PATCH | release-please from commits | package.json, tag vX.Y.Z, CHANGELOG.md |
| Invitation template | SemVer in the folder name | Template designer or developer | manifest.json, templates/<slug>/CHANGELOG.md |
| DB migration | Drizzle sequence number + name | drizzle-kit generate | server/db/migrations |
| Public API (guest, webhook) | Route prefix /v1 | Only via ADR | docs/modules/<module>/api.md |
| Documents | X.Y | Author of the change | Each document's history table |

**App version**

- 0.x until public launch. Each MVP phase is one MINOR: end of phase 1 → 0.1.0, end of phase 8 and launch → 1.0.0.

- After 1.0.0: feat → MINOR, fix and perf → PATCH, ! or BREAKING CHANGE → MAJOR. In 0.x a breaking change only bumps MINOR.

- staging has pre-release versions: 1.4.0-rc.1, 1.4.0-rc.2. production only gets versions without a suffix.

- The version number and commit hash are visible in /health, the X-App-Version header, the team panel footer and every GlitchTip error report.

**Template version**

- The immutability rule of section 5.2 of the technical document stands: a published folder is frozen and CI checks it by hash.

- MAJOR: a schema field removed or its type changed (old content is not migrated). MINOR: new optional field, palette or decoration. PATCH: visual fix with no schema change.

- Template versions are independent of the app version. One app release can include several new template versions; they are listed in the release notes.

**API version**

- Internal panel routes (Server Actions) are unversioned because they are deployed with the same build.

- The guest API and webhooks are versioned because a cached PWA or an external service may call an old version. A breaking change means /v2 alongside /v1 until the cache cycle ends, and removal of /v1 via ADR.

**Document version**

- Content change (new rule, new decision) → Y is bumped: 1.1 → 1.2. Structural rewrite or change of the document's scope → X is bumped.

- Spelling and wording fixes don't bump the version.

- Each version is one row in the history table at the top of the document: version, Jalali date, summary of changes with section numbers.

# **6. Commits and Pull Requests**

Commit messages follow Conventional Commits, because the version and CHANGELOG are built from them. commitlint in husky and CI rejects incorrect messages.

```
<type>(<scope>): <subject>

<body: why, not what>

Refs: #123
BREAKING CHANGE: <what breaks and how to migrate>
```

| **type** | **Use** | **Effect on version** |
| --- | --- | --- |
| feat | New user-facing feature | MINOR |
| fix | Bug fix | PATCH |
| perf | Performance improvement | PATCH |
| refactor | Structural change without behavior change | — |
| test | Tests only | — |
| docs | Docs only | — |
| build · ci · chore | Tooling, pipeline, dependencies | — |
| revert | Reverting a previous commit | Depends |

- scope is one of the modules in section 1: feat(rsvp): allow host override after deadline.

- subject in English, imperative present tense, under 72 characters, no trailing period.

**Working branch**

- Name: <type>/<issue>-<short-name>, e.g. feat/142-excel-import or fix/201-deadline-timezone.

- Every branch has a GitHub issue. No work starts without an issue.

- Branch lifetime at most about three working days; larger work is split into several PRs behind a feature flag.

**Pull Request**

- The PR title uses the commit format, because merges are squashed and the PR title becomes the final commit message.

- Size: target under 400 changed lines (excluding lockfile and generated migrations).

- At least one approval; changes in domain, db/migrations, auth, billing or providers need the tech lead's approval (CODEOWNERS).

- CI must be fully green. Flaky tests are not disabled; they get an issue and are quarantined.

- PRs with UI changes include a screenshot or short video of the mobile and RTL version.

- develop and main are protected: direct push, force push and merge without PR are forbidden.

The full PR checklist is in section 10 and lives in PULL_REQUEST_TEMPLATE.md.

# **7. Database and migrations**

Every migration must be compatible with the previous code version, because migrations run before the new code (section 13.3 of the technical document). A breaking change is done across two or three separate releases.

**Expand and contract pattern**

1. **expand:** a new column or table is added as nullable or with a default. Old code still works.

2. **migrate:** new code writes to both places; old data is moved by a worker job, not inside the migration.

3. **contract:** in the next release, the old column is dropped and the NOT NULL constraint added.

**Rules**

- Migrations are created only with drizzle-kit generate, and the generated file is reviewed. Descriptive name: 0012_add_household_session_capacity.

- A migration merged into develop is never edited; mistakes are fixed with a new migration.

- Dropping, renaming and retyping columns only via the pattern above. Index creation on large tables with CONCURRENTLY.

- Migrations run with a separate DB user; the app user has no DDL privileges.

- Every migration is tested in CI on an empty database and on a seed snapshot.

- Data migrations (changing values) are idempotent scripts in scripts/, with a runbook and tech lead approval.

- Data model changes are recorded in docs/modules/<module>/data-model.md in the same PR, and if they differ from the MVP document's model, the item is also updated in the technical document.

# **8. Documentation system**

Technical documentation lives next to the code and changes in the same PR that changes the code. A PR that changes behavior without updating that section's docs is incomplete and is not merged.

**Two levels of documents**

| **Level** | **Documents** | **Location** | **When it changes** |
| --- | --- | --- | --- |
| Decision documents | MVP document, technical document, business document, this document | Project folder (outside the repo) | New product or architecture decision; with a new document version |
| Implementation documents | Modules, ADRs, runbooks, guides, release notes | docs/ in the repo | Every PR that changes behavior, data or interfaces |

Implementation documents refer to sections of the decision documents and do not repeat rules. If implementation has to deviate from a decision document, an ADR is written first and the decision document is updated in its next version.

**Document types in `docs/`**

| **Type** | **Path** | **Content** | **Owner** |
| --- | --- | --- | --- |
| Module overview | modules/<module>/README.md | Purpose, module boundary, public services, references to MVP document sections | Module's lead developer |
| Data model | modules/<module>/data-model.md | Tables, columns, constraints, computed states | Same |
| Flows | modules/<module>/flows.md | Main flows with Mermaid diagrams | Same |
| Interface | modules/<module>/api.md | Actions, routes, jobs, error codes | Same |
| Module changes | modules/<module>/CHANGELOG.md | Change history of that part | Anyone who changes the module |
| ADR | adr/NNNN-<title>.md | One architecture decision, its reason and consequences | Proposer; tech lead approval |
| Runbook | runbooks/<task>.md | Step-by-step operations: release, rollback, backup restore, key rotation | Tech lead |
| Guide | guides/<topic>.md | Local setup, conventions, third-party licenses | Team |
| Release notes | releases/vX.Y.Z.md | Changes per version for the team and support, in Persian | Release owner |
| Template | templates/<slug>/CHANGELOG.md | Changes per template version | Template designer |

**Header for all documents**

Every docs/ file starts with this frontmatter. CI reports files without frontmatter or with an `updated` older than the last change.

```
---
title: Guest response (RSVP)
module: rsvp
owner: <github-username>
status: active          # draft | active | deprecated
version: 1.3
updated: 1405-07-11
refs: [MVP §6.4, Tech §2.6]
---
```

**Recording each part's changes**

Each module has its own CHANGELOG.md. Changes are added under "Unreleased" in the same PR; at release, the release owner turns the heading into the version number.

```
# rsvp — Changes

## Unreleased
- Added: host can enter responses after the deadline too (#142, ADR-0007)

## 0.6.0 — 1405-08-02
- Changed: session capacity is checked at the HouseholdSession level (#131)
- Fixed: deadline is computed in the Tehran timezone (#128)
```

Allowed labels per line: Added, Changed, Fixed, Removed, Security, Deprecated. Every line has a PR or issue number.

**ADR**

Any decision that would take more than a day of work to reverse needs an ADR: a new library, a new module, deviating from the technical document, a new API version.

```
# ADR-0007: Host entering responses after the deadline

- Status: Accepted          # Proposed | Accepted | Superseded by ADR-NNNN
- Date: 1405-07-20
- Related: MVP §6.4

## Context
## Decision
## Rejected options
## Consequences
```

An accepted ADR is not edited; a new decision is a new ADR that marks the previous one "Superseded".

**Automatic checks in CI**

- A PR changing src/domain/<module> or src/server/services/<module> must also change a file in docs/modules/<module>/; otherwise a no-docs label with a one-line reason is required.

- A PR with a migration must change that module's data-model.md.

- A PR with a new environment variable must change .env.example.

- Internal links in docs/ are checked in CI.

**Language and style**

- docs/ documents are in Persian; file names, code, technical terms and entity names in English.

- Diagrams only as Mermaid inside markdown, so they have diffs in review.

- The first sentence of each section states the conclusion; rules are referenced by decision-document section number, not copied.

# **9. Release, hotfix and rollback**

production is released only via a version tag, after testing on staging and manual approval in GitHub Environments. No release happens on Fridays or within 48 hours before a registered large event, except hotfixes.

**Normal release**

1. The release owner opens a develop → main PR titled release: vX.Y.Z. From this moment develop is open for new work, and fixes for bugs found on staging go via a fix/* PR directly to main and return to develop in step 7.

2. Merge to main → automatic deploy to staging with an rc version.

3. Acceptance testing on staging: Playwright, the device matrix and in-app browsers of section 14.2 of the technical document, manual check of the section 10 checklist.

4. release-please creates the version PR (CHANGELOG and package.json). Merging it creates tag vX.Y.Z.

5. Tag → the production pipeline waits for tech lead approval → migration → deploy worker and app with the same image → /health check.

6. 30 minutes of monitoring errors and queues; then releases/vX.Y.Z.md is finalized and announced in the team channel.

7. main is back-merged into develop.

**Hotfix**

1. hotfix/<issue>-<name> branch from main.

2. PR to main with one approval and full CI; deploy to staging and test that specific case.

3. PATCH tag and production release with steps 4 to 6 above.

4. Back-merge into develop the same day.

**Rollback**

- Code: redeploy the previous tag's image. Because migrations are expand-only (section 7), the previous code works with the new database.

- Migrations are never run backward; fix with a new migration.

- Templates: a template version is not deleted; if a new version has problems, it is removed from the gallery and pinned cards keep showing it until fixed with a PATCH.

- Every rollback has a short report in runbooks/incidents/: what happened, impact, cause, next action.

# **10. Checklists**

These two checklists are placed verbatim in PULL_REQUEST_TEMPLATE.md and docs/runbooks/release.md.

**Pull Request checklist**

- [ ] PR title follows Conventional Commits with the correct scope and is linked to an issue.

- [ ] Business logic is only in domain and services; actions and routes only validate and call.

- [ ] Access and deadlines are checked server-side; there is an integration test.

- [ ] The domain layer has unit tests.

- [ ] Persian strings in strings; no left/right; mobile and RTL display checked and screenshot attached.

- [ ] No personal data in logs.

- [ ] Migration is compatible with the previous code (expand) and data-model.md is updated.

- [ ] docs/modules/<module>/ and the module's CHANGELOG are updated, or a no-docs label with a reason.

- [ ] New environment variable is in env.ts and .env.example and set in all three environments.

- [ ] License of any new third-party library or component is recorded.

- [ ] Guest page size budget is not exceeded.

**Production release checklist**

- [ ] All PRs in this version have been tested on staging.

- [ ] Playwright and Lighthouse CI are green on staging.

- [ ] Manual test done in Chrome Android, Safari iOS and the Telegram in-app browser; for a new template, the other messengers too.

- [ ] Migrations have acceptable run time on an anonymized copy or a large seed.

- [ ] Today's database backup exists.

- [ ] Module CHANGELOGs converted from "Unreleased" to the version number.

- [ ] releases/vX.Y.Z.md written: user-facing changes, support-facing changes, risks.

- [ ] No large event in the next 48 hours, or the tech lead has approved.

- [ ] After deploy: /health green, no new errors in GlitchTip, queue not lagging.

- [ ] main back-merged into develop.

# **11. Open decisions**

| **Topic** | **Options** | **Decision time** |
| --- | --- | --- |
| Tech lead and owner of each module | Assign people for CODEOWNERS | Phase 0 |
| Hosting the development environment | Separate app on Liara or a container on the staging server to reduce cost | Phase 0 |
| Release with release-please or changesets | release-please is simpler for a single package | Phase 0 |
| Minimum PR approvals | One person at the start; two for sensitive modules after the team grows | Phase 0 |
| Syncing decision documents with the repo | Keep markdown versions of decision docs in docs/decisions/ or reference only | Phase 1 |
| Feature flag tool | Environment variable, settings table or self-hosted Unleash | When the first real need arises |
