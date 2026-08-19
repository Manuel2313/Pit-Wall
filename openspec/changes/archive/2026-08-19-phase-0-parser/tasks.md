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
5. PR5 html-overlay - cmd sto-parser; .htm field-for-field; rollback: revert overlay+tests.
6. PR6 byte-diff+mutator - cmd sto-validation-oracle; V1/V2 diff; rollback: revert harness+tests.
7. PR7 gate>=4+docs - cmd full root; criterio 4 autos (PRD v0.4); rollback: revert gate+docs.

> Re-planificación P4 (aprobada por maintainer 2026-08-16): el payload del .sto está cifrado por iRacing (RE exhaustiva: 0 codecs encontrados). Los valores tipados se leen del export HTML oficial (`.htm`), no de los bytes del `.sto`. El `.sto` sigue siendo la caja opaca versionable (round-trip byte-idéntico ya probado). La fase 6 (HTML oracle) queda absorbida por la fase 4.

> Re-planificación P7 (aprobada por maintainer 2026-08-18): el maintainer no dispone de un 5º auto GT3 (adquirirlo está fuera de plan). Criterio de validación ajustado de >=5 a >=4 autos reales distintos (GT3 + Porsche Cup). PRD pasa a v0.4 (secciones §6/§10/§170). No hay fixture nueva: 7.1/7.2 redefinidas a ajuste de gate + docs; 3.3 queda enmendada.

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

- [x] 3.1 [RED->GREEN] fixtures.test.ts/fixtures.ts: 4 distinct cars + roles (V1/V2 diff-pair; rest oracle-source), hash before/after, no writes (D5).
- [x] 3.2 [RED->GREEN] roundtrip.test.ts/serializeSto: SHA-256(serialize(parse(f))) == SHA-256(f); V1/V2 distinct; size == fs (round-trip scenarios).
- [x] 3.3 [RED->GREEN] gate.test.ts/gate.ts: validateGate -> {met, distinctCars, missing}; unmet count 4; never green < 5 (PRD 6/10). (AMENDED 2026-08-18: criterio -> >=4 autos, PRD v0.4; never green < 4.)

## Phase 4: Overlay (HTML export — re-planificada)

- [x] 4.1 [RED->GREEN] html-overlay.test.ts/html-overlay.ts: parse fixed_ferrariGT3296.htm field-for-field (Ferrari match): tire pressures, camber, ride heights, springs, ARB, aero; typed values from HTML export (official iRacing export, not .sto bytes).
- [x] 4.2 GREEN overlay/index.ts: safeParse; unknown/failure -> overlay null, .sto raw kept as opaque box.

## Phase 5: RE harness

- [x] 5.1 [RED->GREEN] byte-diff.test.ts/byte-diff.ts: V1/V2 -> 0 header diffs, >=1 payload region; Ferrari vs Porsche -> layout diffs, notes identical; in-memory (D3). (CORRECCIÓN factual: bytes reales muestran que las notas Ferrari vs Porsche DIFIEREN — 16182 vs 10706 raw; lo estructuralmente idéntico es el trailer. Tests asertan el resultado real.)
- [x] 5.2 [RED->GREEN] mutator.test.ts/mutator.ts: deterministic offset flips, no writes (D3).

## Phase 6: (absorbida por P4 — HTML oracle implementado en html-overlay 4.1/4.2)

## Phase 7: Gate >=4/docs

- [x] 7.1 [RED->GREEN] gate.test.ts/gate.ts: GATE_MIN_CARS 5->4; met @4 autos reales; never green < 4 (PRD v0.4).
- [x] 7.2 GREEN full run: gate verde sobre registry real (4/4 distinct cars); root suite 100% green.
- [x] 7.3 README: workspaces, vitest run, fixture policy.

## Notes

- Threat matrix all N/A -> no threat RED tasks.
- Strict TDD: RED->GREEN order; traceable to scenarios/D1-D6.
- Use npx vitest run only; playwright/ng test are Fase 1; config.yaml out of scope.