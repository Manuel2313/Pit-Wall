# Pit Wall

Setup manager for iRacing sim racing (GT3 + Porsche Cup). Lets you import `.sto` + `.htm` setup pairs, keep versioned history per car/track, diff versions (typed field-by-field for Ferrari 296 GT3, byte-region for everything else), add feedback per version with lap deltas, and export back to byte-identical `.sto` files.

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | Angular 22 (standalone + signals + zoneless) · Tailwind 4 · TypeScript 6 strict |
| Backend | NestJS 11 · PostgreSQL 17 · TypeORM · Zod 4 · argon2id · ThrottlerGuard |
| Parser | Pure-TS `.sto` container parser (byte-identical round-trip) |
| Tests | Vitest (unit) · Playwright (E2E) |
| Monorepo | npm workspaces (`apps/*`, `packages/*`) |

## Prerequisites

- **Node.js** `>= 22.22.3` (project tested on v24)
- **PostgreSQL** `>= 17` installed locally — no Docker required
- **npm** `>= 10`

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Create the database (one-time)
createdb -U postgres pitwall

# 3. Start PostgreSQL (if not already running)
# Windows (no service): run from PowerShell
& 'C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe' start -D 'C:\Program Files\PostgreSQL\17\data'

# 4. Start the API (migrations run automatically on boot)
cd apps/api && npm run start:dev

# 5. Start the web app (in another terminal)
npm run start:web
```

Open `http://localhost:4200`, register a new account, and import a setup from `IRacingSetups/`.

## Environment variables

The API loads `apps/api/.env` on boot. Local overrides go in `apps/api/.env.local` (gitignored).

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | yes | — | PostgreSQL connection string (`postgresql://user:pass@host:5432/pitwall`) |
| `JWT_SECRET` | yes | — | Min 32 chars; signs sessions |
| `PORT` | no | `3000` | API port |
| `NODE_ENV` | no | `development` | `development` / `production` / `test` |
| `FRONTEND_URL` | no | `http://localhost:4200` | Used in password reset emails |
| `STORAGE_PATH` | no | `./storage` | Where `.sto` blobs live on disk |
| `SESSION_TTL_DAYS` | no | `30` | Session lifetime |
| `RESET_TOKEN_TTL_HOURS` | no | `1` | Password reset token lifetime |
| `RESEND_API_KEY` | no | — | If set + `EMAIL_FROM` set, uses Resend; otherwise logs reset tokens to stdout |
| `EMAIL_FROM` | no | — | Sender email for Resend |
| `DISABLE_THROTTLE` | no | `false` | `true` bypasses the rate limiter (useful for E2E against localhost) |

## Commands

Run from the repo root unless noted:

```bash
# Dev servers
cd apps/api && npm run start:dev   # NestJS with hot reload on :3000
npm run start:web                   # Angular dev server on :4200

# Tests
npm test                            # full monorepo (Vitest)
npm run test:api                    # NestJS unit + integration
npm run test:web                    # Angular component tests
npm run test:contracts              # Zod schema tests
npm run test:sto-parser             # parser unit tests
npm run test:e2e                    # Playwright (requires API + Postgres up)

# Build
npm run build:web                   # Angular production build

# Type checking
npx tsc --noEmit                    # strict TS across all packages
```

## Project structure

```
pit-wall/
├── apps/
│   ├── api/              NestJS backend
│   │   ├── src/
│   │   │   ├── auth/        AuthGuard, AuthService, AuthController
│   │   │   ├── catalog/     Cars + Tracks (seed on startup)
│   │   │   ├── import/      /setups preview + confirm
│   │   │   ├── versions/    Version listing + diff
│   │   │   ├── feedback/    Per-version feedback CRUD
│   │   │   ├── tags/        Setup tags
│   │   │   ├── export/      Byte-identical .sto download
│   │   │   ├── storage/     FsStorageAdapter (writes .sto to disk)
│   │   │   ├── config/      Zod env schema
│   │   │   └── database/    TypeORM entities + migrations
│   │   └── .env             Dev config (committed)
│   └── web/              Angular 22 standalone app
│       └── src/app/
│           ├── auth/        Login + Register + authGuard (functional)
│           ├── import/      Upload wizard (3 steps: upload → preview → manual-entry)
│           ├── library/     Three internal views: list / detail / diff
│           └── layout/      Header + nav
├── packages/
│   ├── api-contracts/    Zod schemas shared between api + web
│   ├── sto-parser/       Pure-TS .sto container + HTML overlay parser
│   └── sto-validation-oracle/   Dev-only fixture validation harness
├── e2e/                  Playwright specs + page objects
├── IRacingSetups/        Real .sto + .htm fixtures (SHA-256-pinned)
└── MACHETE.md            Local walkthrough notes (gitignored)
```

## Architecture highlights

- **Shared contracts.** `@pit-wall/api-contracts` exports Zod schemas + inferred types used by both backend validation (`ZodValidationPipe`) and the frontend — no duplicated DTOs.
- **Auth.** Argon2id for passwords (slow, memory-hard), SHA-256 for session tokens (fast; token has 256 bits of entropy). Tokens are stored hashed; raw tokens exist only in the login response and the client's `localStorage`. Password reset triggers a cascade logout.
- **Byte-identical round-trip.** The `.sto` parser preserves every byte so an exported file matches the original SHA-256. The `.htm` overlay is a secondary, typed view used only when the HTML export is attached.
- **Catalog detection fallback.** If the `.sto` notes don't mention a known car name, the API inspects the HTML export for car markers (e.g. `ferrari296gt3`) before giving up.
- **Rate limiting.** `ThrottlerGuard` protects auth endpoints (`register` 5/min, `login` 10/min, `recover` 3/min). Can be bypassed locally via `DISABLE_THROTTLE=true`.

## Testing policy

Strict TDD: every behavior lands with its failing test first (RED → GREEN), tests committed alongside the code they verify.

**Fixture policy (`IRacingSetups/`):**
- Real iRacing exports, committed read-only, SHA-256-pinned in `packages/sto-validation-oracle/src/fixtures.ts`.
- Validation tooling never writes to them (in-memory only).
- Acceptance gate: ≥4 distinct real cars registered — currently met with Ferrari 296 GT3 (V1 + V2 same-car diff pair), Mustang GT3, Mercedes-AMG GT3, Porsche 911 GT3 Cup 992.

## Current status

Phase 1 (MVP) is feature-complete across backend and frontend: auth, import, library (list + detail + diff), feedback, tags, export. E2E suite is green (14/14).

Phase 2 roadmap (not yet scoped in `openspec/`):
- Discord OAuth
- Real email delivery via Resend (currently a stub unless `RESEND_API_KEY` is set)
- More cars with typed HTML overlays (currently only Ferrari 296 GT3)

See `openspec/` for SDD change artifacts and `PRD.md` for the product spec.
