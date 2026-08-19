# Archive Report — phase-0-parser (Pit Wall, Fase 0 — iRacing `.sto` parser)

**Status**: ARCHIVED — change complete, verified, and closed.
**Date**: 2026-08-19
**Archive location**: `openspec/changes/archive/2026-08-19-phase-0-parser/`
**Artifact store mode**: hybrid (openspec filesystem + Engram; Engram copy persisted by orchestrator)
**Branch at close**: master @ `4baa814` (`docs: align phase-0 specs and README with implemented reality`)
**Change folder**: `phase-0-parser` (Fase 0 — isolated pure-TS parser for iRacing's undocumented binary `.sto` setup files)

## Summary

Phase 0 shipped the lossless `sto-parser` library (container parse, byte-identical round-trip, UTF-16LE notes trailer, typed Zod 4 `CarSetup` overlay fed by the official garage HTML export, raw preservation of unknown sections) plus the dev-only `sto-validation-oracle` package (read-only fixture registry, byte-diff RE harness, mutator, HTML export oracle, ≥4-car acceptance gate). Verified against 5 real fixture files covering 4 distinct cars, then archived. The cycle is closed with 0 blockers, 0 CRITICAL, 0 WARNING; the only outstanding items are 4 registered SUGGESTION-level wording/historical-reference items, all non-blocking.

## Task Completion Gate

- tasks.md: **21/21 implementation tasks checked** (`- [x]`), 0 unchecked — verified by inspection at archive time.
- Re-plan notes recorded in tasks.md: P4 (2026-08-16, HTML-export overlay, `.sto` stays an opaque versionable box) and P7 (2026-08-18, acceptance criterion lowered ≥5 → ≥4 distinct real cars, PRD v0.4).
- No archive-time stale-checkbox reconciliation was needed; `sdd-apply` marked all tasks.

## Spec Sync

Main specs did not exist before this change (`openspec/specs/` was empty), so both delta specs are full specs and were copied mechanically (byte-identical, `diff -r` empty, exit 0).

| Domain | Action | Details |
|--------|--------|---------|
| `sto-parser` | Created (full spec) | 5 requirements, 9 scenarios |
| `sto-validation-oracle` | Created (full spec) | 5 requirements, 9 scenarios |

Source of truth updated:
- `openspec/specs/sto-parser/spec.md`
- `openspec/specs/sto-validation-oracle/spec.md`

`rules.archive` (config.yaml: "Warn before merging destructive deltas") reviewed: the merge was purely additive (new main specs created from full delta specs, zero requirement removals or renames) — no destructive delta, no warning required.

## Verification Evidence (final state, native review authority)

| Metric | Value |
|--------|-------|
| Requirements | **10/10 compliant** (sto-parser 5/5, sto-validation-oracle 5/5) |
| Scenarios | **18/18 compliant** (sto-parser 9/9, sto-validation-oracle 9/9) |
| Blockers / CRITICAL / WARNING | 0 / 0 / 0 |
| Native verdict | `{ valid: true, verdict: pass_with_warnings }` |
| Tests | **67/67 passed** (12 files; `npx vitest run` exit 0) |
| Type check | `npx tsc --noEmit` exit 0 |
| Acceptance gate | **met** — `{ met: true, distinctCars: 4, missing: 0 }` |
| Distinct real cars | Ferrari (V1/V2 diff pair), Mustang GT3, Mercedes GT3 (Spa), Porsche Cup 992 |

The acceptance gate reflects PRD v0.4: `GATE_MIN_CARS = 4` in `packages/sto-validation-oracle/src/gate.ts` (commit `b9a90bf`), proven at runtime by `gate.test.ts` against the real registry.

Doc-drift resolution: commit `4baa814` (docs-only, +18/−16) amended spec S16 ("Oracle mismatch detection" → "HTML export cross-map"), design D2 (relaxed `fs` semantics with terminated-trailer exception) and D6 (plain UTF-16LE notes, no XOR codec) so specs match implemented reality; the implementation was unchanged by that commit.

Prior intermediate snapshot corroboration: `verify-report.md` (written 2026-08-18 after the re-run) reported the same final numbers — 18/18 scenarios, 67/67 tests, tsc exit 0, gate met — consistent with the native review verdict and the launch-prompt final-state facts.

## Outstanding Suggestions (registered, NOT fixed — non-blocking)

- **S1** — sto-parser spec wording nits: (a) round-trip scenario "any of the 4 registered fixtures" — the registry holds 5 fixture FILES covering 4 distinct cars; "4" is the distinct-car count; (b) scenario "Known car yields typed values" reads "GIVEN a Ferrari 296 GT3 fixture WHEN parsed" — post-P4-replan the typed values come from the official HTML export (`parseFerrariSetupHtml`), not from `parseSto` on `.sto` bytes. Wording-only; behavior implemented and tested.
- **S3** — `proposal.md` retains historical ≥5-car references (success criteria "Green on ≥5 distinct cars", risks, dependencies) and `openspec/config.yaml` still states ≥5 — orchestrator-owned, no code impact; align or annotate in a future phase (recommended before Fase 1 spec work).
- **S4** — `packages/sto-parser/test/notes.test.ts` describe label references "(D6)" (the XOR codec that does not exist); cosmetic test-title drift.
- **S5** — `design.md` residual wording after `4baa814`: Technical Approach line still describes the overlay as a "read-only Zod projection over the raw payload" (post-replan it is built from the HTML export), and the Testing Strategy table still lists "mismatch report" for the Oracle row (capability removed with S16). Non-behavioral.

These items were intentionally not actioned during archive: S1/S5 live in spec/design text that the docs-alignment commit deliberately left for the archive phase, S3 is orchestrator-owned config/proposal content, and S4 is in test title text under `packages/` which the archive phase must not modify. None affects shipped behavior.

## Risks / Recommendations for Future Phases

- **Fase 1 (web scaffold)** — `openspec/config.yaml` still targets `npx playwright test` / `ng test` (planned, not installed) and carries the ≥5-car wording; the runner commands will only become valid once the Angular + Playwright base project is scaffolded. Align config.yaml and proposal.md ≥5 references to the PRD v0.4 ≥4 criterion (S3) during Fase 1 planning to prevent another doc-drift cycle.
- The `sto-parser` / `sto-validation-oracle` packages are consumable from the Fase 1 UI via `workspace:*`; note the README documents the npm 10 `workspace:*` rejection workaround (plain "0.0.0" version). Preserve the gate contract `{met, distinctCars, missing}` and the strict-TDD RED→GREEN convention.
- No CRITICAL or WARNING issues remain; S1/S4/S5 wording fixes can ride along with Fase 1 spec/design work at zero risk.
- Fixtures (`IRacingSetups/`) are read-only, SHA-256-pinned; future phases must keep the no-write policy and add new cars only through the registry.

## Traceability

Artifacts read during this archive phase (filesystem):
- `openspec/changes/phase-0-parser/proposal.md`
- `openspec/changes/phase-0-parser/specs/sto-parser/spec.md`
- `openspec/changes/phase-0-parser/specs/sto-validation-oracle/spec.md`
- `openspec/changes/phase-0-parser/design.md`
- `openspec/changes/phase-0-parser/tasks.md`
- `openspec/changes/phase-0-parser/verify-report.md`
- `openspec/config.yaml`

Artifacts written:
- `openspec/specs/sto-parser/spec.md` (created, byte-identical copy)
- `openspec/specs/sto-validation-oracle/spec.md` (created, byte-identical copy)
- `openspec/changes/archive/2026-08-19-phase-0-parser/` (moved whole change folder; readback `diff -r` empty, exit 0)
- `openspec/changes/archive/2026-08-19-phase-0-parser/archive-report.md` (this file, additive-only)

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived. Ready for the next change (Fase 1 web scaffold).