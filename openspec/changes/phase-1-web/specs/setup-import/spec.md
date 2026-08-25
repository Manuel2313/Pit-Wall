# setup-import Specification

## Purpose

Import of `.sto` setups (PRD §6): on upload the UI shows METADATA (car, track, category, notes) for confirmation before saving; typed values come from the optional garage HTML export; manual entry is the fallback. Typed values are never claimed to come from the `.sto` binary itself.

## Requirements

### Requirement: Metadata preview on upload

The system MUST extract metadata (car, track, category, notes) from an uploaded `.sto` file and MUST show it for confirmation before saving anything.

#### Scenario: Valid file shows metadata

- GIVEN a valid `.sto` file from a GT3 car
- WHEN the user uploads it
- THEN the UI shows car, track, category and notes for confirmation

#### Scenario: Notes shown when present

- GIVEN an uploaded `.sto` whose trailer contains notes
- WHEN the preview is shown
- THEN the notes appear in the preview

### Requirement: Save requires confirmation

The system MUST NOT create any version until the user confirms the preview. Cancelling MUST discard the upload without side effects.

#### Scenario: Confirm saves the version

- GIVEN a metadata preview shown
- WHEN the user confirms it
- THEN a version is saved with that metadata

#### Scenario: Cancel discards

- GIVEN a metadata preview shown
- WHEN the user cancels
- THEN nothing is saved and no partial data remains

### Requirement: Typed values from HTML export only

The user MAY attach the official garage HTML export; when attached, typed values MUST be extracted and shown. Without it, the system MUST NOT claim typed values from the `.sto`.

#### Scenario: HTML export provides typed values

- GIVEN an upload with an attached garage HTML export
- WHEN the preview is shown
- THEN typed values from the export appear

#### Scenario: No typed values without export

- GIVEN an upload without a garage HTML export
- WHEN the preview is shown
- THEN no typed values are displayed and manual entry is offered instead

### Requirement: Manual entry fallback

The system MUST let the user enter typed values manually when no HTML export is available.

#### Scenario: Manual values saved

- GIVEN a preview without typed values
- WHEN the user enters values manually and confirms
- THEN the version stores the manual values as its typed overlay

### Requirement: Invalid files rejected

The system MUST reject malformed or unrecognized `.sto` files with a clear error and MUST NOT create partial data.

#### Scenario: Corrupt file rejected

- GIVEN an uploaded file that is not a valid `.sto`
- WHEN the user uploads it
- THEN the UI shows a clear error and nothing is saved

#### Scenario: Unsupported car still importable

- GIVEN a valid `.sto` of a car outside the catalog
- WHEN the user uploads it
- THEN metadata is shown without typed values and no data is lost

### Requirement: Import requires authentication

The system MUST require an authenticated session to upload or save an import.

#### Scenario: Anonymous upload rejected

- GIVEN a visitor without a session
- WHEN they try to upload a `.sto`
- THEN the upload is rejected