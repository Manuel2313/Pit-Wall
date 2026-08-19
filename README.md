# Pit Wall

Setup manager for iRacing sim racing (GT3 + Porsche Cup). Fase 0: an isolated `.sto` parser monorepo, validated against real iRacing setup files before any UI is built.

## Workspaces

npm workspaces monorepo (`packages/*`):

| Package | Visibility | Purpose |
|---|---|---|
| `packages/sto-parser` | public — `@pit-wall/sto-parser` | Pure-TS parser/serializer for iRacing `.sto` files: container layer (magic `0x0003`, 16-byte header, payload), UTF-16LE notes trailer, typed `CarSetup` overlay validated with Zod 4. Byte-identical round-trip is a hard requirement. |
| `packages/sto-validation-oracle` | private — `@pit-wall/sto-validation-oracle` | Dev-only validation tooling: read-only fixture registry, byte-diff RE harness, deterministic mutator, HTML-export oracle, acceptance gate. Never ships to consumers. |

## Install

```bash
npm install
```

> **npm 10 note:** npm 10 rejects `workspace:*` protocol links in dependencies. The packages reference each other by plain version (`"@pit-wall/sto-parser": "0.0.0"`) and npm resolves them to the local workspace package — keep package versions in sync across the monorepo.

## Testing

Vitest runs across the whole monorepo from the root (both packages are covered):

```bash
npm test                          # full monorepo suite (same as: npx vitest run)
npm run test:sto-parser           # parser package only
npm run test:sto-validation-oracle  # validation tooling only
npx tsc --noEmit                  # strict TypeScript check (root tsconfig covers all packages)
```

Strict TDD is enforced: every behavior lands with its failing test first (RED → GREEN), and tests are committed together with the code they verify.

## Fixture policy

- `IRacingSetups/` holds **real iRacing exports** committed as read-only fixtures. Validation tooling never writes to them (in-memory only).
- Every fixture is **SHA-256-pinned** in `packages/sto-validation-oracle/src/fixtures.ts`; the test suite asserts the hash before and after runs (immutability check).
- **4 distinct real cars** cover the acceptance gate: Ferrari 296 GT3 (V1/V2 same-car diff pair), Mustang GT3, Mercedes-AMG GT3, Porsche 911 GT3 Cup 992.
- **Acceptance gate** (`GATE_MIN_CARS = 4`, PRD v0.4 §6/§10): the validation suite reports green only with ≥4 distinct real cars registered. `validateGate()` returns `{ met, distinctCars, missing }` — current real registry: `{ met: true, distinctCars: 4, missing: 0 }`.

## Fase 0 scope

Parser library only. UI (Angular), backend (Supabase) and E2E tooling are Fase 1 — see `PRD.md` (source of truth) and `openspec/` for the SDD change artifacts.