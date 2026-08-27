# Tasks: Phase 1 — Pit Wall MVP (web + backend)

## Review Workload Forecast

Estimated changed lines: ~5,800–6,800 authored (scaffold/fixtures excluded). Delivery strategy: ask-on-risk. Split: PR 1 → PR 16 stacked-to-main (proposal G4).

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

1. PR 1 web scaffold — test: test:web; harness: ng build; rollback: rm apps/web.
2. PR 2 api-contracts — test: vitest contracts; harness: N/A (schemas); rollback: rm package.
3. PR 3 api base env/migrations/repos/health — test: vitest api; harness: supertest /health; rollback: revert api.
4. PR 4 storage fs — test: vitest storage; harness: N/A (unit); rollback: revert module.
5. PR 5 auth core — test: vitest auth; harness: supertest flow; rollback: revert auth.
6. PR 6 recovery — test: vitest recovery; harness: supertest reset; rollback: revert recovery.
7. PR 7 catalog — test: vitest catalog; harness: supertest /catalog; rollback: revert catalog.
8. PR 8 import preview — test: vitest import; harness: supertest upload; rollback: revert preview.
9. PR 9 import confirm — test: vitest import; harness: supertest confirm; rollback: revert confirm.
10. PR 10 versions+diff — test: vitest versions; harness: supertest /diff; rollback: revert modules.
11. PR 11 feedback+export+tags — test: vitest feedback; harness: supertest CRUD; rollback: revert modules.
12. PR 12 web auth UI — test: test:web; harness: dev login; rollback: revert web.
13. PR 13 web import UI — test: test:web; harness: dev import; rollback: revert web.
14. PR 14 web library+diff — test: test:web; harness: dev library; rollback: revert web.
15. PR 15 web compare/tags/feedback/export — test: test:web; harness: dev compare; rollback: revert web.
16. PR 16 e2e flow — test: npx playwright test; harness: dev API+Postgres; rollback: rm e2e/.

## Phase 1: Foundation

- [x] 1.1 Root package.json: workspaces apps/*+packages/*; scripts test:api/web/e2e/build.
- [x] 1.2 apps/web: Angular 22 standalone/signals/zoneless + Tailwind 4 + TS6 strict + Vitest; smoke green.
- [x] 1.3 Playwright smoke + sto-parser import smoke; scaffold before UI.
- [x] 1.4 packages/api-contracts: Zod 4 DTOs + types + schema tests.
- [x] 1.5 apps/api: NestJS 11 strict TS + Vitest/pg-mem; /health (BF).
- [x] 1.6 Config: Zod env validation, typed startup error (BF).
- [x] 1.7 Migrations: users/sessions/reset_tokens/cars/tracks/setups/setup_versions/feedback_entries/tags/setup_tags.
- [x] 1.8 [RED->GREEN] Tenant-scoped repos; A≠B unit tests (BF).
- [x] 1.9 [RED->GREEN] StorageAdapter fs + FileNotFound + round-trip.

## Phase 2: Core Implementation (backend)

- [x] 2.1 [RED->GREEN] register argon2id/duplicate + login generic error (UA).
- [x] 2.2 [RED->GREEN] sessions hashed tokens + AuthGuard 401 + logout (UA).
- [x] 2.3 [RED->GREEN] recovery: hashed single-use tokens + EmailSender (UA).
- [x] 2.4 [RED->GREEN] catalog seed 4 cars + tracks; no GT4 (SL).
- [x] 2.5 [RED->GREEN] import preview: metadata+SHA-256; corrupt/unsupported/anon (SI).
- [ ] 2.6 [RED->GREEN] import confirm: overlay → version 1; cancel → none (SI/BF).
- [ ] 2.7 [RED->GREEN] versions chain; /diff typed or byte-region (BF).
- [ ] 2.8 [RED->GREEN] feedback: text required, delta optional, owner-only (FL).
- [ ] 2.9 [RED->GREEN] export byte-identical; no-export manual-only (SE).
- [ ] 2.10 [RED->GREEN] tags owner-scoped; A≠B API tests (SL/BF).

## Phase 3: Integration / Wiring (web UI)

- [ ] 3.1 Web auth: pages, AuthService, guard, /me restore, logout (UA).
- [ ] 3.2 Web import: preview → HTML/manual → confirm/cancel (SI).
- [ ] 3.3 Web library: filters, own-only, history, diff/compare (SL).
- [ ] 3.4 Web feedback/tags/export incl. no-export (FL/SE).

## Phase 4: Testing / Verification

- [ ] 4.1 e2e/: Playwright config + page objects (dev API + Postgres).
- [ ] 4.2 E2E: register→login→reload→import→preview→confirm→history→export SHA (§12.4).
- [ ] 4.3 E2E: user A never sees B; full suite green.

## Phase 5: Cleanup / Documentation

- [ ] 5.1 README: stack, commands, env (Postgres/Resend), Node >=22.22.3.
- [ ] 5.2 .gitignore artifacts; scaffold cleanup; final green.

## Notes

- Threat matrix all N/A → no threat RED tasks. Strict TDD [RED->GREEN]; refs BF/UA/SI/SL/FL/SE.
- E2E only in PR 16 (needs full stack); blockers: Postgres creds, Resend key, Node >=22.22.3 (design).