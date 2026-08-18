# Design: Phase 0 — iRacing `.sto` Parser (isolated)

## Technical Approach

Container-first (proposal, exploration rec. 1+2). Two workspace packages: public `@pit-wall/sto-parser` (pure TS, Zod 4, byte-identical round-trip) and dev-only private `@pit-wall/sto-validation-oracle` (registry, byte-diff RE harness, HTML oracle, ≥4-car gate). The typed `CarSetup` overlay is a **read-only Zod projection** over the raw payload; `serializeSto` always emits raw bytes, so byte-identity holds even when the overlay is absent or fails. First slice: container + notes + round-trip + registry; overlay and RE deferred.

## Architecture Decisions

### D1: Location — npm workspaces monorepo

| Option | Tradeoff | Decision |
|---|---|---|
| `src/sto/` single root package | Simplest; but Vitest and Angular CLI collide at Fase 1; RE tooling ships in the public lib | Rejected |
| `packages/sto-parser` + `packages/sto-validation-oracle` | ~3 extra config files; isolation before scaffold (PRD §10); Fase 1 consumes via `workspace:*`; oracle stays private | **Chosen** |

### D2: Header contract (layout fixed here; spec leaves offsets open)

Verified on all 5 fixtures: 4×`uint32 LE` = 16 bytes.

| Offset | Field | Contract |
|---|---|---|
| 0 | `magic` | MUST be `0x0003`; else `invalid-magic` |
| 4 | `fs` | MUST equal `bytes.length − 16` (verified 18158/18094/18302/12586); else `size-mismatch` |
| 8 | `reserved1` | Opaque; observed 1840–2080 per car; round-trips; never interpreted |
| 12 | `reserved2` | Opaque; observed 16182 GT3 / 10706 Porsche Cup; round-trips |

### D3: RE harness isolation

| Option | Tradeoff | Decision |
|---|---|---|
| `tools/` inside sto-parser | Export/build exclusion must be policed forever | Rejected |
| Separate private package | Maps 1:1 to oracle spec; zero public-lib exposure | **Chosen** |

Harness = in-memory ops only: `byte-diff` (regions), `mutator` (flips), `html-oracle` (HTML → mapping). No file writes.

### D4: Errors and overlay — no raw exceptions

`parseSto` returns `{ ok: true; document } | { ok: false; error: StoParseError }` — never throws for expected failures. `StoParseError.kind`: `invalid-magic | size-mismatch | truncated | trailer-invalid` + byte offset. Overlay: per-car Zod 4 schemas (canonical `CarSetup` YAML names, string values) via `safeParse`; failure or unknown car → `overlay: null`, raw preserved, no fabricated values.

### D5: Fixture registry

Maps `IRacingSetups/*.sto` (committed, read-only): Ferrari V1/V2 (`diff-pair`); Mustang, Mercedes, Porsche Cup (`oracle-source`); Ferrari + HTML = oracle pair. SHA-256-pinned; tests assert hash before/after; no write path.

### D6: Notes codec

Trailer = 2 key bytes + XOR stream + 8×`0x00` terminator. Keystream `k=(k+0xf0)*0xfb % 0xff`, initial `key = k1^k2` (irset-watermark). Decode/encode exact inverses; text as `notes.text`; constants pinned by golden tests on the real V1 trailer.

## Data Flow

    .sto bytes ──parseSto──▶ StoDocument ──serializeSto──▶ raw bytes (SHA-256 === input)
    V1/V2 ──▶ byte-diff ──▶ regions ──▶ overlay hypothesis ──▶ html-oracle

## File Changes

| File | Action | Description |
|---|---|---|
| `package.json` (root) | Create | Private; `workspaces: ["packages/*"]` |
| `packages/sto-parser/{package.json, tsconfig.json (strict), vitest.config.ts}` | Create | Lib scaffold, no framework deps |
| `packages/sto-parser/src/{errors.ts, index.ts}` | Create | Error taxonomy + Result union; public API only |
| `packages/sto-parser/src/container/{header,notes,container}.ts` | Create | Header parse/serialize; XOR codec; parse/serialize |
| `packages/sto-parser/test/{container,notes,roundtrip}.test.ts` | Create | RED-first Vitest suites |
| `packages/sto-validation-oracle/*` | Create | Dev-only pkg: `src/{fixtures,byte-diff,mutator,html-oracle,gate}.ts` + tests |
| `IRacingSetups/*` | Keep | Commit as read-only fixtures (currently untracked) |

## Interfaces / Contracts

```ts
interface StoHeader { magic: 3; fs: number; reserved1: number; reserved2: number }
type StoParseResult = { ok: true; document: StoDocument } | { ok: false; error: StoParseError };
interface StoDocument { header: StoHeader; payload: Uint8Array;
  notes: { raw: Uint8Array; text: string }; overlay: CarSetup | null }
type CarSetup = { categories: Record<string, Record<string, string>> };
function parseSto(bytes: Uint8Array): StoParseResult;   // input never mutated
function serializeSto(doc: StoDocument): Uint8Array;
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Container | Header parse; magic/fs errors; immutability | Unit: synthetic + 5 real fixtures |
| Notes | Decode golden; encode inverse; round-trip | V1 trailer bytes |
| Round-trip | SHA-256 equality per fixture; V1 vs V2 stay distinct | Parameterized over registry |
| Oracle | HTML field-for-field vs overlay; mismatch report | Slice 2 (`fixed_ferrariGT3296.htm`) |
| Gate | Distinct-car count; unmet (<4) and met (≥4) reporting | Registry-driven |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary; file access is read-only.

## Migration / Rollout

No migration. Additive; rollback = delete `packages/`.

## Open Questions

- Trailer boundary scan rule: pinned by RED golden tests in apply — non-blocking.
- Resolved 2026-08-18 (maintainer decision): acceptance criterion is ≥4 distinct real cars (Ferrari, Mustang, Mercedes GT3 + Porsche Cup) — no additional GT3 `.sto` from the user is required (buying a 5th car is out of plan).

## First Slice (feeds sdd-tasks)

Workspace scaffold + strict tsconfig + Vitest; `errors.ts`, `header.ts`, `notes.ts`, `container.ts`, `index.ts`; tests (container/notes/roundtrip/immutability); oracle pkg `fixtures.ts` + registry/immutability/gate tests (gate reports unmet). **Excluded: typed overlay, byte-diff, html-oracle** (slice 2).