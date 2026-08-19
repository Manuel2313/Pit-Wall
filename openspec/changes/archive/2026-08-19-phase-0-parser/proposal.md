# Proposal: Phase 0 — iRacing `.sto` Parser (isolated)

> **Audit note (2026-08-19):** the historical success-criteria reference to ">=5" was superseded by PRD v0.4 (>=4 distinct real cars, decision 2026-08-18) and PRD v0.5 (own backend for Fase 1); archived as-is for audit trail, not updated.

## Intent

Parse iRacing's undocumented binary `.sto` setups with zero data loss, proven on real files before any UI — all downstream features depend on it. Ships only the isolated parser library (pure TS + Vitest + Zod 4); no UI, no backend.

## Scope

### In Scope
- Pure-TS parser lib (container + typed overlay + serializer), no framework deps.
- Byte-identical round-trip (hard requirement): parse→serialize reproduces the file exactly, incl. notes trailer.
- Typed `CarSetup` (Zod 4, canonical YAML names); unknown sections preserved raw.
- Byte-diff RE harness; HTML export parsed as field-mapping oracle.

### Out of Scope
- Angular UI, import flow, Supabase backend/RLS.
- Semantic diff engine, versioning, export endpoints.
- Non-GT3/Porsche Cup categories; multi-sim.

## Capabilities

### New Capabilities
- `sto-parser`: container parse/serialize (byte-exact round-trip), typed `CarSetup` overlay, raw preservation, notes trailer.
- `sto-validation-oracle`: byte-diff RE tooling + HTML-export cross-mapping on real fixtures.

### Modified Capabilities
None (fresh repo).

## Approach

Container-first (exploration rec. 1+2): (a) parse magic `0x0003`/`fs`/payload/trailer → byte-exact round-trip; (b) typed overlay via controlled-mutation byte-diff RE, names from `CarSetup` YAML, HTML as oracle; unknown bytes raw. Validated pre-scaffold. **First slice:** container + round-trip + notes trailer + fixture registration (4 files); overlay deferred.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/sto/` (or standalone pkg) | New | Parser, serializer, Zod schemas |
| `src/sto/fixtures/` | New | Real `.sto` + HTML oracle fixtures |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Payload layout undocumented | High | Container-first guarantees round-trip regardless; RE incremental |
| 4 distinct cars now; PRD gate is 5 | Med | User adds 1–2 GT3 makes in parallel during phase |
| Per-car schema variance + unknown value encoding | Med | Zod passthrough + raw preservation; oracle mapping + golden byte-diff tests |

## Rollback Plan

Additive pure-TS lib; no DB/UI/migrations. Rollback = delete folder (no commits yet). Fixtures are user copies, never modified.

## Dependencies

- Present: Ferrari V1/V2 (diff pair), Mustang, Mercedes, Porsche Cup 992, HTML oracle.
- **User adds 1–2 GT3 makes during phase** (gate ≥5 cars, PRD §6/§10).
- Optional: `.ibt` for `CarSetup` YAML cross-check.
- Toolchain: Node + Vitest + Zod 4 (minimal scaffold, no Angular).

## Success Criteria

- [ ] Byte-identical round-trip on all fixtures (hash equals original).
- [ ] Typed `CarSetup` (Zod 4) for known cars; unknown sections round-trip raw.
- [ ] Ferrari 296 GT3 (Spa) mapping matches HTML oracle field-for-field.
- [ ] Notes trailer round-trips byte-identically.
- [ ] Green on ≥5 distinct cars (4 + user-added) — PRD acceptance; strict TDD in isolation.