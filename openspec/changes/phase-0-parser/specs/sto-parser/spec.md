# sto-parser Specification

## Purpose

Lossless parser/serializer for iRacing's undocumented binary `.sto` setup files (PRD §6 parser epic, §10 fase 0, blocking). Covers the container layer (magic `0x0003` LE, 16-byte header, declared payload size, main payload, XOR-obfuscated notes trailer), a typed `CarSetup` overlay validated with Zod 4 using canonical YAML names, and raw preservation of unknown sections. Pure TS library, no framework deps, validated in isolation before any UI.

## Requirements

### Requirement: Container parse

The parser MUST parse the container layer of a `.sto` file: 4-byte LE magic `0x0003`, 16-byte header, declared payload size, main payload, and trailing notes section. The parser MUST reject malformed containers with a typed error, never a raw exception.

#### Scenario: Real Ferrari fixture parses

- GIVEN `IRacingSetups/lemans_FerrariGT3_Claude_V1.sto` (18174 bytes, magic `0x0003`)
- WHEN the parser reads the file
- THEN it returns a container with the expected magic, size, payload and notes sections
- AND the input bytes are never mutated

#### Scenario: Invalid magic rejected

- GIVEN a buffer whose first 4 bytes are not `0x0003` LE
- WHEN the parser reads it
- THEN it returns a typed parse error identifying the invalid magic

### Requirement: Byte-identical round-trip

Parse followed by serialize MUST reproduce the original file byte-for-byte (identical SHA-256) on every fixture, including payload and notes trailer.

#### Scenario: All fixtures round-trip

- GIVEN any of the 4 registered fixtures
- WHEN parsed and re-serialized without modification
- THEN the output bytes equal the input bytes exactly

#### Scenario: Round-trip preserves per-file identity

- GIVEN Ferrari V1 and V2 (same length 18174, identical 16-byte header, differing payload)
- WHEN both are parsed and serialized
- THEN each output equals its own input and the two outputs remain distinct

### Requirement: Notes trailer round-trip

The parser MUST decode the XOR-obfuscated notes trailer and MUST re-encode it byte-identically on serialize.

#### Scenario: Notes preserved

- GIVEN a fixture whose trailer contains XOR-obfuscated notes terminated by 8 zero bytes
- WHEN parsed and serialized
- THEN the trailer bytes are identical to the original
- AND the decoded notes are exposed as plain text

### Requirement: Typed CarSetup overlay

The parser MUST expose parsed values as a typed `CarSetup` model validated by Zod 4 schemas using canonical `CarSetup` YAML names. Validation failure MUST NOT lose data: raw bytes remain available for round-trip.

#### Scenario: Known car yields typed values

- GIVEN a Ferrari 296 GT3 fixture
- WHEN parsed
- THEN suspension, differential and aero values are available as typed fields with canonical names

#### Scenario: Unknown car falls back to raw

- GIVEN a fixture not covered by any typed schema
- WHEN parsed
- THEN the payload is preserved raw and no fabricated typed value is produced

### Requirement: Unknown-section raw preservation

The serializer MUST emit unknown or undocumented payload sections byte-identically (forward compatibility with unmodeled cars).

#### Scenario: Unknown bytes survive serialize

- GIVEN a fixture with sections outside the typed overlay
- WHEN serialized
- THEN unknown sections appear in the output byte-for-byte as parsed

#### Scenario: Known and unknown coexist

- GIVEN a fixture containing both typed and unknown sections
- WHEN serialized
- THEN the output preserves both without reordering