# Payknameh (پیک‌نامه)

Persian-first digital invitation platform. The MVP is Iranian weddings: a host web app to build and
manage the event, and a guest PWA with a personal invitation and per-session RSVP.

- Product and architecture decisions: [`docs/specs/`](docs/specs/) (MVP, Technical Architecture, Coding Standards)
- Working rules for this repo: [`CLAUDE.md`](CLAUDE.md)
- Developer guides (Persian): [`docs/guides/`](docs/guides/)

## Local setup

Takes about 10 minutes on a fresh machine. Everything runs locally: PostgreSQL and MinIO in
Docker, SMS printed to the console, no real secrets.

### 1. Prerequisites

| Tool                            | Version                        | Check                        |
| ------------------------------- | ------------------------------ | ---------------------------- |
| Node.js                         | 22 (see `.nvmrc`)              | `node -v`                    |
| pnpm                            | 10.33.2 (see `packageManager`) | `corepack enable && pnpm -v` |
| Docker Desktop or Docker Engine | with Compose v2                | `docker compose version`     |

Ports used: 3000 (app), 3001 (worker health), 5432 (PostgreSQL), 9000/9001 (MinIO).

### 2. Install and start

```bash
git clone <repo-url> payknameh && cd payknameh
cp .env.example .env            # local sample values only
docker compose up -d --wait     # PostgreSQL + MinIO, healthy
pnpm install
pnpm db:migrate                 # schema + job queue, run as the migrator user
pnpm db:seed                    # sample data (fills up from PK-037)
```

If Docker Hub or npm is unreachable (e.g. from Iran), set `REGISTRY_MIRROR` and `NPM_REGISTRY` in
`.env` before `docker compose up` — see [`docs/guides/local-setup.md`](docs/guides/local-setup.md).

### 3. Run

Two terminals:

```bash
pnpm dev        # site on http://payknameh.localhost:3000, panels on http://app.payknameh.localhost:3000
pnpm worker     # background jobs; health on http://localhost:3001/health
```

Check it is alive:

```bash
curl localhost:3000/health      # {"status":"ok","version":"0.0.0","commit":"…", …}
```

### 4. Test

```bash
pnpm lint && pnpm typecheck
pnpm test                               # unit + integration (needs docker compose up)
pnpm exec playwright install chromium   # once
pnpm e2e                                # Playwright at 360, 390 and 768 px
```

### 5. Run the production image locally

The app and the worker ship as one Docker image; only the command differs.

```bash
# stop pnpm dev and pnpm worker first: they use the same ports
APP_COMMIT=$(git rev-parse --short HEAD) docker compose --profile image up --build -d
curl localhost:3000/health && curl localhost:3001/health
docker compose --profile image down
```

### Common tasks

| Task                                | Command                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------- |
| Stop services, keep data            | `docker compose stop`                                                      |
| Reset the database and storage      | `docker compose down -v && docker compose up -d --wait && pnpm db:migrate` |
| New migration after a schema change | `pnpm db:generate` (review the SQL), then `pnpm db:migrate`                |
| Format everything                   | `pnpm format`                                                              |

### Troubleshooting

- **`Invalid environment variables` on start:** a value in `.env` is missing or wrong; the message
  names it. Compare with `.env.example`.
- **`permission denied for schema …`:** your Docker volume predates a role change. Reset it with
  `docker compose down -v` (local data is lost).
- **Port already in use:** stop the other process, or change `DB_PORT`, `S3_PORT`,
  `APP_IMAGE_PORT` or `WORKER_IMAGE_PORT` in `.env`.

## Working on a card

Cards live in Jira project PAY (mirrored to Trello). Branch names follow the card:
`chore/PK-001-scaffold-nextjs`. Commits use Conventional Commits with a module scope, for example
`feat(rsvp): allow host override after deadline`; the hooks check this on commit.
