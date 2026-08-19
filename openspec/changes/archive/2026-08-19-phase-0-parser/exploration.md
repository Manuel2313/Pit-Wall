## Exploration: phase-0-parser — iRacing .sto setup file parser

### Current State

Pit Wall is a fresh repository (PRD v0.3 only; no code). Fase 0 (priority 1, blocking) requires parsing iRacing setup files (`.sto`) with **no data loss**, validated against **at least 5 real files** (GT3 cars + at least one Porsche Cup). Planned stack (NOT scaffolded): Angular standalone/signals/zoneless, Tailwind 4, Zod 4, strict TypeScript, Supabase RLS, Playwright. Strict TDD enabled per `openspec/config.yaml` (`test_command: npx playwright test` — runner convention applies once the app scaffold exists).

The `.sto` format is only partially documented publicly.

**Container layer (confirmed** — `Eiii/irset-watermark`):
- offset 0: `uint32 LE` magic `0x0003`
- offset 4: `uint32 LE` `fs` = main payload size
- offset 8: main payload (`fs` bytes) — car id, track id, setup categories/parameters (layout undocumented)
- trailing: notes section — 2 random key bytes + XOR-obfuscated text (keystream `k=(k+0xf0)*0xfb % 0xff`, key = k1^k2), terminated by 8 zero bytes (`uint64` 0)

**Payload layer (not publicly documented)**: no open-source binary parser exists. Commercial tools (RaceNow, SetupDiffer, iRacing Setup Sync) are closed-source; Setup Sync deliberately hashes file contents. Community tooling (`amedora/mose` Perl, `tjhayasaka/iracing-setup-diff` Elm, Setup Viewer) parses the garage **HTML export** instead of the binary.

**Canonical parameter model (confirmed** — `@irsdk-node/types` `setup-info.d.ts`, mirrors the `CarSetup` YAML embedded in `.ibt` telemetry files): categories `Suspension`/`Chassis` (General, Front, LeftFront/LeftRear/RightFront/RightRear corners, Rear, RearArb, Graphics), `TiresAero` (TireCompound, corner TireInfo, AeroPackage, FrontAero, BodyAero, RearAero, AeroCalculator), `DriveBrake` (Differential, PowerUnitConfig, BrakeSystemConfig), `Dampers` (4 corners × LowSpeedComp/HighSpeedComp/LowSpeedRebound/HighSpeedRebound), `Drivetrain` (Engine, Gearbox, Differential_RcOnly). All YAML values are strings. `CarSetup` is free-form per car (`additionalProperties: true` in iRacing's `session-schema.yml` from `racedirector/iracing.rs`).

**Real-file sources**: simracingsetup.com datapacks (`SRS_[season]_[car]_[track]_[type][ver].sto`; types Q/R/E/Wet), ROWA convention (`tt#_cc_f_iii_vXX.sto`), `jamiehs/kamelgt` (Discord `.sto` attachments). Install path: `Documents/iRacing/setups/[car]/`.

**Validation oracle insight**: the same setup data exists in 3 representations — binary `.sto` (ground truth for the sim), garage HTML export (easy to parse), and `CarSetup` YAML inside `.ibt` session info (canonical names). Cross-validating the parser against the YAML/HTML representations turns an undocumented binary format into a testable contract.

### Affected Areas

- (apply phase, new code — no existing files affected) pure TS parser module + Vitest + Zod 4 schemas; e.g. `src/sto/` or standalone `@pit-wall/sto-parser` package
- `openspec/changes/phase-0-parser/proposal.md` — next artifact; must reference the evidence/validation plan (openspec rules)
- Test fixtures: `>=5` real `.sto` files supplied by the user (4+ different GT3 makes + 1 Porsche Cup)

### Approaches

1. **Container-first parser with raw payload preservation** — parse magic/size/notes trailer; treat the main payload as opaque bytes with a typed overlay for known structures; round-trip = byte-identical when unmodified.
   - Pros: guarantees the "no data loss" acceptance criterion immediately; forward-compatible with unknown cars; decouples from the undocumented layout; notes trailer round-trips
   - Cons: limited semantic access until the payload is reverse-engineered
   - Effort: Low (container) / Medium (typed overlay)

2. **Full payload reverse-engineering up front** — controlled mutation + byte-diff (change one garage parameter, save twice, diff the files), cross-validated against `CarSetup` YAML (`.ibt`) and the HTML export.
   - Pros: full typed model; enables the semantic diff that Fase 0 ultimately needs; names come from the canonical `setup-info.d.ts` structure
   - Cons: requires real files (and ideally a matching `.ibt`/HTML export) before implementation; per-car schema variance
   - Effort: Medium/High

3. **Parse only the HTML export** (community approach) — avoid the binary entirely.
   - Pros: trivial, well-trodden (mose, iracing-setup-diff, Setup Viewer)
   - Cons: contradicts the PRD (`.sto` binary is the requirement); HTML is a generated artifact, not ground truth; no write support
   - Effort: Low

### Recommendation

Approach 1 + 2 combined, sequenced: (a) container parse/serialize with **byte-exact round-trip** (satisfies "no data loss" immediately, including the notes trailer), (b) typed overlay for the payload built during the apply phase via byte-diff reverse engineering on the user-supplied fixtures, using `CarSetup` YAML naming (`setup-info.d.ts`) as the canonical schema reference and HTML export/`.ibt` as the validation oracle. Implement as a **pure TS library with Vitest + Zod 4, validated in isolation BEFORE the Angular scaffold**, keeping Fase 0 independently testable. No UI work in this change.

### Risks

- Payload layout is undocumented; byte-diff RE depends on user-supplied real files (`>=5`, 4+ GT3 makes + 1 Porsche Cup). Without them, only the container layer can be implemented and verified.
- Per-car schema variance (`additionalProperties: true`): unknown cars may not match typed schemas → raw-section preservation fallback required to keep the no-data-loss guarantee.
- Value encoding unknown (strings with units, float encodings, per-car ranges) — mitigated by byte-diff + oracle cross-validation.
- "No data loss" must be defined operationally in the proposal: byte-identity on untouched payload, lossless round-trip of parsed parameters, and notes trailer round-trip.

### Ready for Proposal

Yes — proceed to sdd-propose for `phase-0-parser`. Tell the user: provide `>=5` real `.sto` files (different GT3 makes + 1 Porsche Cup); optionally also the matching garage HTML exports and/or `.ibt` files for the same setups to use as the validation oracle.