```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:53754ea2850622ef3bc92c4bf13efb2bf22790b079ee1c41b8ba2150b2da82be
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 10/10
scenarios: 18/18
test_command: npx vitest run
test_exit_code: 0
test_output_hash: sha256:c7639aeb54360a06bbc91959cf0d0cac11e908b99aff4aa706d3ec9929b61977
build_command: npx tsc --noEmit
build_exit_code: 0
build_output_hash: sha256:f01a374e9c81e3db89b3a42940c4d6a5447684986a1296e42bf13f196eed6295
```

# Verification Report — phase-0-parser (Pit Wall, Fase 0) — RE-RUN after doc-drift resolution

**Change**: phase-0-parser
**Version**: N/A (PRD v0.4 acceptance: ≥4 distinct real cars)
**Mode**: Strict TDD (test runner: `npx vitest run`)
**Date**: 2026-08-18 (re-run)
**Branch**: master @ 4baa814 (`docs: align phase-0 specs and README with implemented reality`)

## Summary

Re-run of the formal verification. The previous run reported 17/18 scenarios with a canonical `fail` envelope, blocked by the known doc-drift S16/D2/D6. Commit **4baa814** resolved all three: the oracle spec scenario "Oracle mismatch detection" was rewritten as "HTML export cross-map" (matching the tested `html-overlay`/`overlay` implementation), design.md D2 (relaxed fs semantics: non-canonical fs legal when the trailer is ≥8 bytes and ends in 8 zero bytes — real Spa 80-byte record trailer) and D6 (plain UTF-16LE notes, no XOR codec) were amended, the sto-parser spec no longer mentions XOR-obfuscated notes, and the README line was fixed to "UTF-16LE notes trailer".

This re-run confirms: **10/10 requirements and 18/18 scenarios COMPLIANT** against the amended specs, with the implementation unchanged (4baa814 is docs-only: 4 files, +18/−16). Runtime evidence reproduced independently: **67/67 tests pass across 12 files, `npx tsc --noEmit` exit 0**. Acceptance gate over the real registry: **met — { met: true, distinctCars: 4, missing: 0 }** (proven by `gate.test.ts` at runtime). 0 blockers, 0 CRITICAL, 0 WARNING remaining; 5 SUGGESTION-level items (wording/historical references, non-blocking). No source code was modified during verification; tasks.md untouched (orchestrator-owned).

**Verdict: PASS WITH WARNINGS** — evidence complete (18/18), gate met, drift resolved; remaining items are SUGGESTION-level only.

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 21 |
| Tasks complete | 21 |
| Tasks incomplete | 0 |

Task boxes were marked by the orchestrator (`git status` shows `M openspec/changes/phase-0-parser/tasks.md`). This report did NOT touch tasks.md.

## Per-Task Evidence

| Task | Test file (count) | What proves the task |
|---|---|---|
| 1.1 | — (config) | Root `package.json`: `private: true`, `workspaces: ["packages/*"]`, scripts `test` / `test:sto-parser` / `test:sto-validation-oracle`. Verified by inspection. |
| 1.2 | — (config) | `packages/sto-parser`: `package.json` (public lib, zod ^4.4.3), `tsconfig.json` (strict), `vitest.config.ts`. Verified by inspection. |
| 1.3 | — (config) | `packages/sto-validation-oracle`: `package.json` (`"private": true`), `tsconfig.json`, `vitest.config.ts`. Verified by inspection. |
| 1.4 | — (fixtures) | `git ls-files IRacingSetups` → 6 committed read-only files: 5 `.sto` + `fixed_ferrariGT3296.htm`. Verified via git. |
| 1.5 | — (deps) | vitest ^3.2.7 + zod ^4.4.3 in manifests; smoke green = whole suite green (67/67 below); `openspec/config.yaml` untouched (still states ≥5 — orchestrator-owned). |
| 1.6 | — (config) | Root `.gitignore`: `node_modules/`, `dist/`, `coverage/` (+ `.atl/`). Verified by inspection. |
| 2.1 | `test/errors.test.ts` (3) | Error taxonomy exactly `invalid-magic \| size-mismatch \| truncated \| trailer-invalid` + typed error with kind/offset (D4); `errors.ts` implements `createParseError`. |
| 2.2 | `test/header.test.ts` (5) | `parseHeader`: golden V1/V2 headers (magic 3, fs 18158, res1 1936, res2 16182); magic ≠ 0x0003 → `invalid-magic`@0; non-canonical fs with unterminated trailer → `size-mismatch`@4; too-short → `truncated`@0. Matches amended D2 (relaxed fs semantics, Spa 80-byte trailer legal). |
| 2.3 | `test/notes.test.ts` (5) | `notes.ts`: V1 golden decode — raw 16182 bytes, plain text 8090 chars with exact start/end golden strings; `encodeNotes` inverse = exact raw bytes; Porsche notes (5352 chars) golden; bad trailer → `trailer-invalid`@24; short trailer → `truncated`@24. Matches amended D6 (plain UTF-16LE, no XOR). |
| 2.4 | `test/container.test.ts` (7) | `parseSto`: real Ferrari V1 → header/payload/trailer/notes sections; input never mutated; truncated real Ferrari → `truncated`@4; Spa parses with 80-byte record trailer (non-canonical fs legal when terminated); Porsche Cup parses (payload 12586); `serializeSto` reproduces V1 and V2 exactly. |
| 2.5 | `test/index.test.ts` (2) | `index.ts` exports `parseSto`, `serializeSto`, `ERROR_KINDS`, types (`StoDocument`, `StoParseResult`, `StoHeader`, `NotesSection`, `CarSetup`, …); exported API round-trips real V1. |
| 3.1 | `test/fixtures.test.ts` (7) | `fixtures.ts`: 5 real fixtures registered, **4 distinct cars** (Ferrari, Mustang, Mercedes, Porsche Cup); V1/V2 flagged `diff-pair` with variants, rest `oracle-source` (D5); size pins match disk (`statSync`); SHA-256 pins match current bytes; registry frozen (no write path); hash before/after parser run unchanged + fs cross-check per fixture. |
| 3.2 | `test/roundtrip.test.ts` (3) | Byte-identical round-trip: SHA-256(serialize(parse(f))) === SHA-256(f) for all 5 fixtures; V1/V2 round-trip to their own bytes and outputs remain distinct; serialized size == original, payload length == fs. |
| 3.3 (amended) | `test/gate.test.ts` (4) | `gate.ts` `validateGate → {met, distinctCars, missing}`: unmet with missing counts for 1/2/3 cars, never green < 4; met exactly at 4; duplicates (V1/V2) counted once (PRD v0.4, amended criterion ≥4). |
| 4.1 | `test/html-overlay.test.ts` (10) | `html-overlay.ts`: typed Ferrari 296 values field-for-field from official export `fixed_ferrariGT3296.htm` — 4 tire pressures "159 kPa"; camber per corner (−4.0/−3.3 deg); ride heights (53.1/62.3 mm); spring rates (250/190 N/mm); ARB blades/options, toe (−3.0/+1.5 mm); aero (RearWingAngle 10°, RH at speed 49/53 mm, downforce 41.6%); differential (DiffPreload 110 Nm, FrictionFaces 10, GearStack FIA); unknown car → null; malformed HTML → null (no fabricated values). |
| 4.2 | `test/overlay.test.ts` (5) | `overlay/index.ts`: Zod 4 `carSetupSchema` accepts valid categories record; rejects non-object / missing or non-record categories / non-string values; `.sto` stays opaque — `overlay: null` and serialize byte-identical (raw preserved, no data loss). |
| 5.1 | `test/byte-diff.test.ts` (8) | `byte-diff.ts`: V1/V2 → 0 header diffs, 11 contiguous payload runs (golden), 0 notes diffs, 0 trailer diffs, sameLayout+sameLength; Ferrari vs Porsche → layout diffs (fs 18158 vs 12586, notes raw 16182 vs 10706, notes text differs, trailer structurally identical, trailerDiffCount 0); regions sorted/disjoint/in-bounds with kind↔span coherence; identical inputs → zero regions; non-.sto input → typed `invalid-magic` error, never throws; in-memory, fixtures hash unchanged, inputs never mutated (D3). |
| 5.2 | `test/mutator.test.ts` (8) | `mutator.ts`: same seed → identical bytes+flips (determinism); different seeds → different offsets; exactly N distinct in-range flips; each flip toggles exactly one bit (power-of-two xor); input never mutated, fresh buffer; fixtures hash unchanged; empty input / zero count → empty flips; flip count capped at buffer length (D3). |
| 7.1 | `test/gate.test.ts` (4, re-asserted) | `gate.ts` `GATE_MIN_CARS = 4` (5→4): real registry → met=true, distinctCars=4, missing=0; same-car versions count once; never green with 1/2/3 cars (missing = GATE_MIN_CARS − count); met exactly at 4 (PRD v0.4). |
| 7.2 | Full root suite | `npx vitest run` → 12 files, 67/67 passed (sto-parser 40/40 + oracle 27/27); gate green over the real registry (test 1 of `gate.test.ts`); root `npx tsc --noEmit` exit 0. Reproduced in this re-run. |
| 7.3 | — (docs) | Root `README.md`: workspaces table (public/private), npm 10 `workspace:*` rejection note (plain "0.0.0" version workaround), vitest commands (root + per package), tsc command, strict-TDD note, fixture policy (read-only, SHA-256 pins, 4 distinct cars), gate semantics `{met, distinctCars, missing} = {true, 4, 0}`. Notes trailer wording fixed to "UTF-16LE" by 4baa814. Verified by inspection. |

## Requirements Coverage

### specs/sto-parser/spec.md (amended) — 5/5 requirements, 9/9 scenarios

| Requirement | Scenarios | Status |
|---|---|---|
| Container parse | Real Ferrari fixture parses; Invalid magic rejected | ✅ COMPLIANT (container.test.ts 7 tests + header.test.ts golden/error tests) |
| Byte-identical round-trip | All fixtures round-trip; Round-trip preserves per-file identity | ✅ COMPLIANT (roundtrip.test.ts 3 tests, SHA-256 over all 5 fixture files) |
| Notes trailer round-trip | Notes preserved | ✅ COMPLIANT (notes.test.ts golden decode + encode inverse + roundtrip byte-identity; spec now reads UTF-16LE — matches implementation exactly) |
| Typed CarSetup overlay | Known car yields typed values; Unknown car falls back to raw | ✅ COMPLIANT (html-overlay.test.ts 10 tests + overlay.test.ts 5 tests; typed values from the official HTML export per approved P4 re-plan; wording nit in S1) |
| Unknown-section raw preservation | Unknown bytes survive serialize; Known and unknown coexist | ✅ COMPLIANT (overlay.test.ts opaque-box test + roundtrip byte-identity, no reordering possible by construction) |

### specs/sto-validation-oracle/spec.md (amended) — 5/5 requirements, 9/9 scenarios

| Requirement | Scenarios | Status |
|---|---|---|
| Fixture registry | Registry lists distinct cars; Fixtures immutable | ✅ COMPLIANT (fixtures.test.ts 7 tests: 4 distinct cars, V1/V2 diff-pair flags, SHA-256 pins, frozen registry, hash before/after) |
| Payload size variation coverage | Variable payload sizes parse | ✅ COMPLIANT (container.test.ts Spa + Porsche tests, fixtures.test.ts fs cross-check: 18158 vs 12586, no fixed size assumed) |
| Byte-diff RE harness | Ferrari V1 vs V2 diff; Different cars diff | ✅ COMPLIANT (byte-diff.test.ts 8 tests incl. golden 11-run V1/V2 and Ferrari/Porsche layout+notes+trailer facts) |
| HTML export oracle (amended) | Ferrari field-for-field match; HTML export cross-map | ✅ COMPLIANT (html-overlay.test.ts 10 tests + overlay.test.ts 5 tests: field-for-field canonical names with units; unknown car → null; malformed HTML → null; `.sto` opaque, unknown bytes survive serialize unchanged) |
| Acceptance gate ≥4 cars | Gate unmet; Gate met | ✅ COMPLIANT (gate.test.ts 4 tests: unmet <4 with missing counts, met @4 real registry) |

**Compliance summary**: 18/18 scenarios compliant; 0 UNTESTED; 0 FAILING.

## Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| Container parse | ✅ Implemented | Typed errors, never throws; input never mutated; Spa 80-byte record trailer handled (amended D2 semantics) |
| Byte-identical round-trip | ✅ Implemented | `serializeSto` = prefix + payload + trailer concatenation; proven per fixture by SHA-256 |
| Notes trailer round-trip | ✅ Implemented | UTF-16LE extraction + NUL-terminated trailer; encode inverse proven |
| Typed CarSetup overlay | ✅ Implemented | Zod 4 `safeParseCarSetup`, canonical names, string values with units; null on failure/unknown |
| Unknown-section raw preservation | ✅ Implemented | `.sto` kept opaque; overlay never alters serialized bytes |
| Fixture registry | ✅ Implemented | Frozen entries, SHA-256 pins, roles, carKey dedupe for gate |
| Payload size variation | ✅ Implemented | No fixed-size assumption anywhere; 12586 vs 18158 exercised |
| Byte-diff RE harness | ✅ Implemented | Region classification (header/payload/notes/trailer), layout derivation from parser |
| HTML export oracle | ✅ Implemented | Field mapping from HTML export per amended spec; typed values never fabricated |
| Acceptance gate ≥4 | ✅ Implemented | `GATE_MIN_CARS = 4`, `{met, distinctCars, missing}`, never green < 4 |

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| D1 — npm workspaces monorepo | ✅ Yes | `packages/sto-parser` + `packages/sto-validation-oracle` (private) |
| D2 — Header contract (amended) | ✅ Yes | design.md now matches implementation: `8 + fs ≤ bytes.length` else `truncated`; non-canonical fs legal when trailer ≥8 bytes ending in 8 zeros (Spa fs 18302 vs 18374, 80-byte record trailer); else `size-mismatch` — proven by container.test.ts Spa test and header.test.ts |
| D3 — RE harness isolation | ✅ Yes | Separate private package; byte-diff/mutator in-memory only; no-write tests |
| D4 — Errors and overlay | ✅ Yes | Result-union, 4 error kinds + offset; `overlay: null` on failure/unknown; raw preserved |
| D5 — Fixture registry | ✅ Yes | Frozen, SHA-256-pinned, roles (diff-pair / oracle-source) |
| D6 — Notes section (amended) | ✅ Yes | design.md now matches implementation: plain UTF-16LE text, NUL-pair terminator, `raw`/`text`/`encodeNotes` inverse; no XOR codec (exhaustive RE found none) — proven by notes.test.ts golden tests |

## Doc-Drift Resolution (commit 4baa814)

| Drift | Previous state | Resolution | Status |
|---|---|---|---|
| S16 — Oracle mismatch detection | Spec scenario with no covering test/implementation (replan casualty) | Spec rewritten: requirement "HTML export oracle" + scenarios "Ferrari field-for-field match" / "HTML export cross-map" now describe the tested `html-overlay`/`overlay` behavior (typed values from the export, unknown/malformed → null, `.sto` opaque) | ✅ RESOLVED — covered by html-overlay.test.ts (10) + overlay.test.ts (5) |
| D2 — fs == len−16 false for Spa | design.md D2 claimed `fs` MUST equal `bytes.length − 16` else `size-mismatch` (contradicted by real Spa: 18302 vs 18374) | D2 amended: relaxed semantics (truncated rule + terminated-trailer exception) exactly matching `header.ts`/`validateTrailer` | ✅ RESOLVED — design matches code |
| D6 — XOR codec nonexistent | design.md D6 described 2-key-byte XOR keystream; notes are actually plain UTF-16LE | D6 amended to plain UTF-16LE description (golden V1 8090 / Porsche 5352 chars); sto-parser spec purpose/notes requirement + README wording also fixed | ✅ RESOLVED — design/spec/README match code |

## Issues Found

**CRITICAL**: None. **WARNING**: None remaining (S16/D2/D6 resolved by 4baa814). **Blockers**: 0.

**SUGGESTION** (non-blocking, archive-phase optional):

- **S1** — sto-parser spec wording nits (still applicable after 4baa814): (a) round-trip scenario says "any of the 4 registered fixtures" — the registry holds 5 fixture FILES covering 4 distinct cars; "4" is the distinct-car count, the test proves round-trip on all 5 files; (b) scenario "Known car yields typed values" still reads "GIVEN a Ferrari 296 GT3 fixture WHEN parsed" — post-P4-replan the typed values come from the official HTML export (`parseFerrariSetupHtml`), not from `parseSto` on `.sto` bytes. Wording-only; behavior is implemented and tested (COMPLIANT).
- **S3** — `proposal.md` retains historical ≥5-car references (success criteria "Green on ≥5 distinct cars", risks, dependencies) and `openspec/config.yaml` still states ≥5 — intentionally untouched per apply-progress (orchestrator-owned); align or annotate during archive.
- **S4** — `test/notes.test.ts` describe label references "(D6)" (the XOR codec that does not exist); cosmetic test-title drift, optional cleanup.
- **S5** — design.md residual wording after 4baa814: Technical Approach line still describes the overlay as a "read-only Zod projection over the raw payload" (post-replan it is built from the HTML export), and the Testing Strategy table still lists "mismatch report" for the Oracle row (capability removed with S16). Non-behavioral; reword during archive.

## TDD Compliance

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | apply-progress topic `sdd/phase-0-parser/apply-progress` (#17) has TDD Cycle Evidence tables for P4 (4.1/4.2), P5 (5.1/5.2), P7 (7.1–7.3); P1–P3 RED→GREEN documented in tasks.md annotations and session summaries |
| All tasks have tests | ✅ | 21/21 — every code task has a committed test file (7.2 = full-suite run, 7.3 = docs task) |
| RED confirmed (tests exist) | ✅ | 12 test files exist and are wired into vitest configs |
| GREEN confirmed (tests pass) | ✅ | 67/67 pass on independent execution (this re-run) |
| Triangulation adequate | ✅ | Multi-case per behavior: html-overlay 10, byte-diff 8, mutator 8, container 7, fixtures 7, header/notes 5, gate 4, overlay 5, roundtrip 3, errors/index 3+2 |
| Safety Net for modified files | ✅ | Recorded per work unit: P4 ✅ 25/25 baseline, P5 ✅ 11/11, P7 ✅ 67/67 baseline + tsc OK |

**TDD Compliance**: 6/6 checks passed.

## Test Layer Distribution

| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 67 | 12 | vitest 3.2.7 (node env) |
| Integration | 0 | 0 | not installed (not needed) |
| E2E | 0 | 0 | not installed (Fase 1) |
| **Total** | **67** | **12** | |

Real SHA-256-pinned fixtures in `IRacingSetups/` act as the integration path (read-only). All tests are unit tests over pure functions with real fixture bytes.

## Assertion Quality

**Assertion quality**: ✅ All assertions verify real behavior.

Audit performed on all 12 test files: no tautologies, no orphan empty checks, no ghost loops (all loops iterate constant non-empty fixture arrays — `FIXTURE_FILES` (5), `listFixtures()` (5), counts [1,2,3] — and assert real values inside), no smoke-only tests, no implementation-detail coupling, no mock-heavy tests (zero `vi.mock`). `expect(setup).not.toBeNull()` guards are always combined with value assertions in the same test (TS narrowing pattern).

## Quality Metrics

**Linter**: ➖ Not configured — skipped.
**Type Checker**: ✅ No errors — `npx tsc --noEmit` exit 0 (whole project, strict tsconfigs).
**Coverage**: ➖ No coverage provider configured in vitest configs — "Coverage analysis skipped — no coverage tool detected" (informational, not a failure).

## Runtime Evidence (executed by this re-run)

**Tests** (root, `npx vitest run`): ✅ **12 files, 67/67 passed, 0 failed, 0 skipped** — exit code 0, duration 1.24s (vitest v3.2.7). Per-file: errors 3, header 5, notes 5, container 7, index 2, roundtrip 3, overlay 5, html-overlay 10 (sto-parser 40) + fixtures 7, gate 4, byte-diff 8, mutator 8 (oracle 27).
`test_output_hash: sha256:c7639aeb54360a06bbc91959cf0d0cac11e908b99aff4aa706d3ec9929b61977`

**Build/type-check** (root, `npx tsc --noEmit`): ✅ exit code 0, empty output.
`build_output_hash: sha256:f01a374e9c81e3db89b3a42940c4d6a5447684986a1296e42bf13f196eed6295`

`evidence_revision: sha256:53754ea2850622ef3bc92c4bf13efb2bf22790b079ee1c41b8ba2150b2da82be` (SHA-256 of concatenated test+build outputs)

## Gate Result

| Field | Value |
|-------|-------|
| met | **true** |
| distinctCars | **4** (Ferrari, Mustang, Mercedes, Porsche Cup) |
| missing | **0** |

Proven at runtime by `gate.test.ts` > "reports the real registry (4 distinct cars) as met" (passed in this re-run), backed by `gate.ts` `GATE_MIN_CARS = 4`.

## Verdict

**PASS WITH WARNINGS** — evidence complete: 10/10 requirements, 18/18 scenarios compliant; 67/67 tests green; `tsc` clean; acceptance gate met at 4 distinct real cars (PRD v0.4). The S16/D2/D6 doc-drift that blocked the previous run is resolved by commit 4baa814 (docs-only: 4 files, +18/−16, implementation untouched). 0 blockers, 0 CRITICAL, 0 WARNING remaining; 5 SUGGESTION-level items (S1 spec wording nits, S3 historical ≥5 references — orchestrator-owned, S4 cosmetic test title, S5 design.md residual wording) for the archive phase. No source code modified; tasks.md untouched (orchestrator-owned).