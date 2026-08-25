# setup-export Specification

## Purpose

Portable export (PRD §5, §9): download a setup as a `.sto` file to copy manually into the iRacing setups folder. Export exists only for versions created from an uploaded file; for manual-only setups the UI communicates that no export exists.

## Requirements

### Requirement: Export for imported versions

The system MUST let the user download, as a `.sto` file, any version created from an uploaded file. The download MUST be byte-identical to the uploaded original (same SHA-256).

#### Scenario: Download matches the original

- GIVEN a version created from an uploaded `.sto`
- WHEN the user downloads it
- THEN the file's SHA-256 equals the original upload's

#### Scenario: Any imported version exportable

- GIVEN a setup with several imported versions
- WHEN the user exports any of them
- THEN the download succeeds and matches that version's file

### Requirement: No export for manual-only versions

The system MUST NOT offer a `.sto` download for versions created entirely by manual entry, and the UI MUST state that no export exists for them.

#### Scenario: Manual version shows no export

- GIVEN a version created by manual entry with no uploaded file
- WHEN the user looks for the export option
- THEN the UI explains that no `.sto` export exists for this version

### Requirement: Export ownership

The system MUST only allow the owning user to download a version's file.

#### Scenario: Other user's export rejected

- GIVEN user B requests the export of user A's version
- WHEN the download is attempted
- THEN it is rejected and no file is returned

### Requirement: Manual installation

The export MUST be a plain file download; the system MUST NOT install files into the iRacing folder automatically.

#### Scenario: User installs the file manually

- GIVEN a downloaded `.sto` export
- WHEN the user copies it into the iRacing setups folder
- THEN no further system action is required and the file is usable as-is