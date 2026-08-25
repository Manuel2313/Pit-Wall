# backend-foundation Specification

## Purpose

Backend service (PRD §8): NestJS + TypeScript + PostgreSQL, per-user isolation verified by tests, `.sto` storage, version snapshots and diffs.

## Requirements

### Requirement: Backend service availability

The system MUST provide its backend as a NestJS + TypeScript API persisted on PostgreSQL, and MUST report a typed startup error when the database is unreachable.

#### Scenario: Healthy startup

- GIVEN PostgreSQL is reachable
- WHEN the backend starts
- THEN it starts and answers health checks

#### Scenario: Database unreachable

- GIVEN PostgreSQL is down
- WHEN the backend starts
- THEN it fails with a typed connection error

### Requirement: Per-user data isolation

The system MUST isolate all user data per account (RLS-equivalent, PRD §9): a user MUST NOT read, modify or delete another user's setups, versions, feedback, tags or files. Tests MUST prove user A cannot access user B's data.

#### Scenario: User A cannot read user B's setup

- GIVEN user A and user B each own a setup
- WHEN user A requests user B's setup
- THEN the request is rejected

#### Scenario: User A cannot modify user B's setup

- GIVEN user B owns a setup and user A knows its identifier
- WHEN user A attempts to update or delete it
- THEN the operation is rejected and user B's data is unchanged

#### Scenario: Isolation proven by tests

- GIVEN the test suite
- WHEN it runs
- THEN a test proves user A cannot access user B's data

### Requirement: Original file storage

The system MUST store the original uploaded `.sto` file per version using in-house storage (filesystem default; an S3-compatible adapter MAY replace it later). The stored file MUST be retrievable byte-identically.

#### Scenario: Stored file round-trips

- GIVEN a version created from an uploaded `.sto`
- WHEN its stored file is retrieved
- THEN the bytes match the upload exactly

#### Scenario: Missing file reported

- GIVEN a version whose stored file is unavailable
- WHEN the file is requested
- THEN a typed error is returned

### Requirement: Version snapshots

Every save MUST create an immutable version snapshot with a version number, a SHA-256 of the stored file, and a reference to the previous version (the first version has none).

#### Scenario: First save creates version 1

- GIVEN a new setup with no versions
- WHEN the user saves it
- THEN exactly one version exists, numbered 1, with the saved file's SHA-256

#### Scenario: Later saves chain versions

- GIVEN a setup with version 1
- WHEN the user saves again
- THEN version 2 exists, referencing version 1 as its previous version

### Requirement: Diff between versions

The system MUST compute a diff between any two versions: typed field diff (only changed fields, with old and new values) when both carry a typed overlay; otherwise byte-level diff by region.

#### Scenario: Typed diff shows only changed fields

- GIVEN two versions of the same setup whose typed overlays differ in one parameter
- WHEN the diff is computed
- THEN only that parameter appears, with its old and new values

#### Scenario: Byte diff for versions without overlay

- GIVEN two versions with no typed overlay
- WHEN the diff is computed
- THEN it reports byte-level differences by region

### Requirement: Strict typing and validation

The system MUST be written in strict TypeScript (no `any`, no `ts-ignore`) and MUST validate configuration and incoming data with Zod 4 schemas, rejecting invalid data with typed errors.

#### Scenario: Invalid configuration rejected

- GIVEN the backend starting with missing or invalid configuration
- WHEN startup validation runs
- THEN the backend fails with a typed validation error

#### Scenario: Malformed request rejected

- GIVEN a request whose body does not match the expected schema
- WHEN the request is processed
- THEN it is rejected with a typed validation error