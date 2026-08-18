# sto-validation-oracle Specification

## Purpose

Validation tooling that proves the `sto-parser` against real files before any UI (PRD §6/§10 gate: ≥4 distinct cars): read-only fixture registry, byte-diff reverse-engineering harness, and garage HTML export cross-mapping oracle. Strict TDD: every capability is validated in isolation with Vitest on real fixtures.

## Requirements

### Requirement: Fixture registry

The suite MUST register the real fixtures read-only: Ferrari V1/V2 (same-car versions), Mustang GT3, Mercedes GT3 (Spa), Porsche Cup 992. The registry MUST expose car make and fixture role (diff pair / oracle source) per entry.

#### Scenario: Registry lists distinct cars

- GIVEN the registered fixtures
- WHEN the registry is queried
- THEN it reports 4 distinct cars (Ferrari, Mustang, Mercedes, Porsche Cup) and flags V1/V2 as same-car versions of a diff pair

#### Scenario: Fixtures immutable

- GIVEN a registered fixture
- WHEN any validation step runs
- THEN the fixture bytes are unchanged after the run

### Requirement: Payload size variation coverage

The suite MUST exercise payloads of different sizes (GT3 ≈18 KB vs Porsche Cup ≈12.5 KB) and MUST NOT assume a fixed payload size.

#### Scenario: Variable payload sizes parse

- GIVEN `watkinglens.sto` (12602 bytes, Porsche Cup) and a GT3 fixture (~18 KB)
- WHEN both are parsed
- THEN both succeed with payload sizes matching their declared size fields

### Requirement: Byte-diff RE harness

The harness MUST accept two `.sto` files and report byte-level differences localized by region (header / payload / notes). The harness MUST NOT write to fixtures.

#### Scenario: Ferrari V1 vs V2 diff

- GIVEN V1 and V2 (identical 16-byte header, same length, differing payload)
- WHEN the harness diffs them
- THEN it reports zero header differences and one or more payload regions with differing bytes

#### Scenario: Different cars diff

- GIVEN a Ferrari and a Porsche Cup fixture
- WHEN the harness diffs them
- THEN it reports payload size/layout differences and isolates the notes trailer as structurally identical

### Requirement: HTML export oracle

The suite MUST parse the garage HTML export (`IRacingSetups/fixed_ferrariGT3296.htm`) and cross-map each parameter to the corresponding typed `CarSetup` value from the parser.

#### Scenario: Ferrari field-for-field match

- GIVEN the Ferrari Spa `.sto` and its HTML export
- WHEN mapped values are compared
- THEN each parameter in the HTML export matches the corresponding parser value field-for-field

#### Scenario: Oracle mismatch detection

- GIVEN a mapped parameter whose `.sto` value differs from the HTML export
- WHEN the oracle check runs
- THEN the mismatch is reported with parameter name and both values

### Requirement: Acceptance gate ≥4 cars

The suite MUST NOT report green until validated on ≥4 distinct cars (PRD §6 acceptance, §10 fase 0). The gate MUST report the current distinct-car count.

#### Scenario: Gate unmet

- GIVEN fewer than 4 distinct cars registered (e.g. 3)
- WHEN the validation gate runs
- THEN it reports the gate as unmet with the count of missing cars

#### Scenario: Gate met

- GIVEN ≥4 distinct cars registered and green on all fixtures
- WHEN the validation gate runs
- THEN it reports the gate as met