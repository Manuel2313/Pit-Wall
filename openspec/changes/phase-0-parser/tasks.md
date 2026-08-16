# Tasks: Phase 0 - .sto Parser (isolated)

## Review Workload Forecast

Estimated changed lines: ~1,500-1,700 (binary fixtures excluded)
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Work Units - 8 chained PRs (cmds: `npx vitest run packages/<pkg>`)

1. PR1 Bootstrap+fixtures - smoke cmd; npm install harness; rollback: rm files.
2. PR2 errors/header/notes - cmd sto-parser; V1 trailer golden; rollback: revert src+tests.
3. PR3 container+roundtrip - cmd sto-parser; SHA-256 fixtures; rollback: revert container+tests.
4. PR4 registry+gate - cmd sto-validation-oracle; immutability; rollback: rm oracle pkg.
5. PR5 overlay+raw - cmd sto-parser; Ferrari/Porsche; rollback: revert overlay+tests.
6. PR6 byte-diff+mutator - cmd sto-validation-oracle; V1/V2 diff; rollback: revert harness+tests.
7. PR7 html-oracle - cmd sto-validation-oracle; .htm cross-map; rollback: revert oracle+tests.
8. PR8 gate>=5+docs - cmd full root; user 5th fixture; rollback: revert entry+test.

## Phase 1: Foundation

- [x] 1.1 Root package.json: private, workspaces packages/*, scripts.
- [x] 1.2 Scaffold packages/sto-parser: package.json, strict tsconfig, vitest.config.ts.
- [x] 1.3 Scaffold packages/sto-validation-oracle: package.json (private), tsconfig, vitest.config.ts.
- [x] 1.4 Commit IRacingSetups/* as read-only fixtures (setup task).
- [x] 1.5 Install vitest + zod@4; smoke test green; config.yaml untouched.
- [x] 1.6 Root .gitignore: node_modules, dist, coverage.

## Phase 2: Container layer

- [x] 2.1 [RED->GREEN] errors.test.ts/errors.ts: kinds invalid-magic|size-mismatch|truncated|trailer-invalid + offset (D4).
- [x] 2.2 [RED->GREEN] header.test.ts/header.ts: magic != 0x0003 -> invalid-magic; fs != len-16 -> size-mismatch (Invalid magic; D2).
- [x] 2.3 [RED->GREEN] notes.test.ts/notes.ts: V1 trailer golden decode/encode inverse (D6); bad -> trailer-invalid (Notes).
- [x] 2.4 [RED->GREEN] container.test.ts/container.ts: parseSto Ferrari V1 -> sections; input unmutated; truncated (Real Ferrari).
- [x] 2.5 GREEN index.ts: export parseSto/serializeSto + types.

## Phase 3: Round-trip/registry

- [ ] 3.1 [RED->GREEN] fixtures.test.ts/fixtures.ts: 4 distinct cars + roles (V1/V2 diff-pair; rest oracle-source), hash before/after, no writes (D5).
- [ ] 3.2 [RED->GREEN] roundtrip.test.ts/serializeSto: SHA-256(serialize(parse(f))) == SHA-256(f); V1/V2 distinct; size == fs (round-trip scenarios).
- [ ] 3.3 [RED->GREEN] gate.test.ts/gate.ts: validateGate -> {met, distinctCars, missing}; unmet count 4; never green < 5 (PRD 6/10).

## Phase 4: Overlay/raw preservation

- [ ] 4.1 [RED->GREEN] overlay.test.ts/ferrari296.ts: Ferrari 296 typed suspension/differential/aero; unknown bytes survive, unreordered (Known/Unknown/coexist).
- [ ] 4.2 GREEN overlay/index.ts: safeParse; unknown/failure -> overlay null, raw kept.

## Phase 5: RE harness

- [ ] 5.1 [RED->GREEN] byte-diff.test.ts/byte-diff.ts: V1/V2 -> 0 header diffs, >=1 payload region; Ferrari vs Porsche -> layout diffs, notes identical; in-memory (D3).
- [ ] 5.2 [RED->GREEN] mutator.test.ts/mutator.ts: deterministic offset flips, no writes (D3).

## Phase 6: HTML oracle

- [ ] 6.1 [RED->GREEN] html-oracle.test.ts/html-oracle.ts: fixed_ferrariGT3296.htm field-for-field (Ferrari match).
- [ ] 6.2 [RED->GREEN] mismatch report {param, stoValue, htmlValue} (Mismatch).

## Phase 7: Gate >=5/docs

- [ ] 7.1 [DEP: user GT3 fixture #5] Register 5th car in fixtures.ts + hash pin.
- [ ] 7.2 [DEP: user GT3 fixture #5] gate.test.ts: >=5 green -> met; full run green.
- [ ] 7.3 README: workspaces, vitest run, fixture policy.

## Notes

- Threat matrix all N/A -> no threat RED tasks.
- Strict TDD: RED->GREEN order; traceable to scenarios/D1-D6.
- Use npx vitest run only; playwright/ng test are Fase 1; config.yaml out of scope.