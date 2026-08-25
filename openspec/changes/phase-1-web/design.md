# Design: Phase 1 — Pit Wall MVP (web + backend propio)

## Technical Approach

Extend Fase 0 monorepo: `apps/web` (Angular 22 standalone/signals/zoneless, Tailwind 4, strict TS), `apps/api` (NestJS 11 + TypeORM + Postgres), shared `packages/api-contracts` (Zod 4 DTOs); `sto-parser` consumed unchanged via `"0.0.0"`. Import (approved re-scope): `.sto` → metadata-only preview (header, notes, SHA-256) → optional HTML export or manual entry for typed overlay → confirm → immutable version. Isolation: app-layer RLS-equivalent (PRD §9), proven by A≠B tests. Node 22 LTS (≥22.22.3), no Node 24-only APIs.

## Architecture Decisions

### D1: Backend hosting — Render
| Option | Tradeoff | Decision |
|---|---|---|
| Railway / Fly.io / Hetzner VPS | Costlier free tier / more ops | Rejected |
| Vercel serverless | Unfit for long-running NestJS + disk storage | Rejected |
| **Render (web service + managed Postgres)** | Free tier fits MVP; persistent disk serves storage adapter | **Chosen** |

### D2: Workspace layout
| Option | Tradeoff | Decision |
|---|---|---|
| Single package | Angular CLI and Nest tooling collide | Rejected |
| **`apps/web` + `apps/api` + `packages/api-contracts`** | Root workspaces extended; root TS 7.0.2/Vitest untouched; TS 6.x nested in web; Fase 0 unaffected | **Chosen** |

### D3: Auth — DB-backed opaque sessions
| Option | Tradeoff | Decision |
|---|---|---|
| JWT-only (no revocation) / Passport | Spec demands logout invalidation / heavier | Rejected |
| **Opaque bearer token, hashed in `sessions`; argon2id via `@node-rs/argon2`** | Logout = row delete: revocable, expiry testable | **Chosen** |

Reset tokens: hashed, single-use, expiring; email via Resend behind `EmailSender` interface.

### D4: Isolation — app-layer tenant scoping
| Option | Tradeoff | Decision |
|---|---|---|
| Postgres native RLS | Policies + per-request `SET LOCAL`; more moving parts | Rejected |
| **`userId` from validated session scopes every repository query; children only via owned setup** | Simple, testable A≠B at API level | **Chosen** |

### D5: Storage — `StorageAdapter`, filesystem default

Keys `storage/{userId}/{setupId}/{versionId}.sto` (user-namespaced), typed `FileNotFound`; SHA-256 in DB verifies byte-identity; S3-compatible adapter MAY replace later (spec).

### D6: Data access — TypeORM
| Option | Tradeoff | Decision |
|---|---|---|
| Prisma / Drizzle | Codegen clashes with root TS 7.0.2 / younger NestJS docs | Rejected |
| **TypeORM** | NestJS-native, versioned migrations, SQL simple enough for pg-mem tests | **Chosen** |

### D7: Contracts — shared Zod 4 package
| Option | Tradeoff | Decision |
|---|---|---|
| OpenAPI codegen | Two sources of truth, no runtime validation | Rejected |
| **`packages/api-contracts`: Zod per DTO; `ZodValidationPipe` on API, `z.infer` client on web** | Single source of truth; per-car overlay = `carSetupSchema` from sto-parser (config rule: Zod per car) | **Chosen** |

## Data Flow

Import (complex flow — sequence):

    User  web           api                 storage  db
     │ upload .sto ────▶│ parseSto metadata │        │
     │ ◀ preview        │ (notes, sha256)   │        │
     │ attach HTML/manual▶│ validate schema │        │
     │ confirm ────────▶│ create version ──▶│ put    │
     │ (version_no, parent, sha256, overlay)────────▶│
     │ cancel → nothing persisted

Diff: both versions have overlay → typed diff (changed fields, old/new); otherwise byte-region diff of stored files.

## File Changes

| File | Action | Description |
|---|---|---|
| `package.json`, `README.md` (root) | Modify | workspaces `apps/*`; scripts `test:api`, `test:web`, `test:e2e`, `build:web` |
| `packages/api-contracts/*` | Create | Zod DTO schemas + inferred types |
| `apps/api/*` | Create | NestJS modules (config, db, storage, auth, catalog, setups, versions, diff, feedback, tags, export) + migrations + tests |
| `apps/web/*` | Create | Angular 22: login, library, detail, import, compare; Tailwind 4; Vitest |
| `e2e/*` | Create | Playwright config, page objects, specs (register → login → import → history) |
| `packages/sto-parser`, `sto-validation-oracle` | Keep | Untouched |

## Interfaces / Contracts

REST under `/api`, bearer session, Zod-validated: `POST /auth/{register,login,logout,recover,reset}`, `GET /auth/me`; `GET /catalog/{cars,tracks}`; `POST /setups` (multipart `.sto` + optional `.htm`), `GET /setups?car=&track=&condition=`, `GET /setups/:id`; `POST /setups/:id/versions`, `GET /setups/:id/versions`, `GET /versions/:vid/file` (typed "no export" for manual-only), `GET /diff?from=&to=`; `POST /versions/:vid/feedback`, `GET /setups/:id/feedback`, `PATCH|DELETE /feedback/:fid`; `PUT|DELETE /setups/:id/tags`.

DB: `users`, `sessions`, `reset_tokens`, `cars` (4), `tracks`, `setups (user_id, car, track, condition)` UNIQUE per user, `setup_versions (version_no, parent_id, file_ref, sha256, overlay jsonb|null)`, `feedback_entries`, `tags`, `setup_tags`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Auth hash/session/revocation; typed + byte diff; storage adapter; repository scoping | Vitest 3.2.7 (root) + pg-mem (no Docker) |
| Integration | supertest: register→login→CRUD; A≠B isolation; malformed body → 400; export byte-identity | NestJS app + pg-mem |
| E2E | register → login → import real fixture → preview → confirm → history; export SHA-256 | Playwright (`e2e/`) vs dev API + real Postgres |

## Threat Matrix

N/A — no shell, subprocess, VCS/PR automation, process-integration, or executable-classification boundary. Uploaded files are data parsed in-memory, never executed; writes are adapter-scoped, user-namespaced.

## Migration / Rollout

TypeORM migrations versioned; reversed in order on rollback. Stacked PRs per proposal (web-base → backend-foundation → user-auth → first-e2e-flow), each independently revertible; `IRacingSetups/` never written. No data migration (fresh schema).

## Open Questions

- [ ] Postgres credentials for dev/E2E (human, pre-PR2) — blocks backend-foundation E2E.
- [ ] HTML typed overlay exists only for Ferrari 296; other 3 catalog cars manual-entry until mappings added (accepted for MVP).
- [ ] Render free tier spins down after inactivity — confirm acceptable.