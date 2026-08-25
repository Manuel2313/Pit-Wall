# Proposal: Phase 1 — Pit Wall MVP (backend propio)

## Intent

Build the Fase 1 MVP (accounts, import, versioning/diff, feedback, comparison, tags, export — PRD §5–§7) on Fase 0's parser. Fase 0 proved the `.sto` payload opaque → import criterion re-scoped. Approved: **backend propio** (NestJS + TS + PostgreSQL) over Supabase — to **learn backend development** (auth/RLS/storage in-house, tested).

## Scope

**In:** `apps/web` (Angular 22 standalone/signals/zoneless, Tailwind 4, strict TS); `apps/api` (NestJS + Postgres; in-house email/password auth, JWT, route protection; RLS; `.sto` storage, filesystem/S3 adapter); import `.sto` → metadata preview → confirm → version (SHA-256); typed overlay via optional garage HTML export; manual fallback; versioning/diff (typed or byte-diff), feedback, comparison, tags, export (imported versions); catalog: 4 GT3 + Porsche Cup cars; TDD (Vitest + Playwright).

**Out:** GT4; companion app; telemetry; SaaS; deploy; Discord OAuth.

## Goals & Success Criteria

- G1 Product: login → import → history flows (§12.4)
- G2 Learning: backend built with tests; user explains each decision
- G3 Quality: strict TS, RED→GREEN, E2E green, RLS verified (A ≠ B)
- G4 Delivery: stacked PRs → master, ≤400 lines/PR

## Capabilities

**New:** `user-auth`, `setup-import`, `setup-library`, `feedback-log`, `setup-export`, `backend-foundation`. **Modified:** none.

## Approach

Extend monorepo (`apps/web` + `apps/api`); consume `sto-parser` via plain `"0.0.0"` link; Angular 22 on Node 24.19.0 ✓. Rejected: Supabase (black-box auth/RLS, vendor lock, kills G2), Angular 19 (EOL), separate repo, Docker local.

## First Slice (stacked PRs → master)

1. `feat/web-base`: scaffold + runners + import smoke + scripts
2. `feat/backend-foundation`: NestJS + full migrations + RLS + storage + typed client
3. `feat/user-auth`: auth + route protection + E2E login
4. `feat/first-e2e-flow`: import → save → history (§12.4)

## PRD Amendments (v0.4→v0.5, approved)

| § | Change |
|---|---|
| §6 | Import criterion → metadata preview; typed values via HTML export; manual fallback |
| §8 | Stack → backend propio (NestJS/TS/Postgres); hosting updated |
| §10 | "GT3/GT4" → "GT3 + Porsche Cup" |
| §5/§6/§9/§12 | Dependent wording: import flow, Supabase Auth, RLS, §12.2/§12.3 |

## Affected Areas

`apps/web`+`apps/api` (new); `sto-parser` (consumed); root `package.json`/`README.md`; `PRD.md`.

## Risks

- Auth/RLS leak: Med → RLS tests (A≠B), per-PR review
- Backend effort: Med → auth as own work unit
- TS 7 vs Angular TS 6.x: Low → verify in PR1
- Postgres creds pending: Med → human provides pre-PR2
- Review budget: Med → generated files excluded, chained PRs

## Rollback Plan

Each PR revertible independently; migrations reversed in order; `IRacingSetups/` untouched.

## Dependencies

Node 24.19.0 ✓; Postgres creds (pre-PR2); Discord creds (later). Orchestrator-owned: align `openspec/config.yaml`; annotate archived ≥5 ref.

## Open Questions

1. Postgres hosting? (design)
2. Vercel or Netlify? (deferred)