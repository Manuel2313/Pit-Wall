# feedback-log Specification

## Purpose

Track-side feedback tied to a specific version (PRD §5, §6): free text plus lap delta, shown in chronological order. Deliberately simple: no structured per-parameter fields.

## Requirements

### Requirement: Feedback on a version

The user MUST be able to add free-text feedback and a lap delta to a specific version. Text MUST be required; the lap delta MAY be omitted.

#### Scenario: Feedback with text and delta

- GIVEN a version of a setup
- WHEN the user adds feedback with text and a lap delta
- THEN the feedback is stored attached to that version

#### Scenario: Feedback without delta

- GIVEN a version of a setup
- WHEN the user adds feedback with text only
- THEN the feedback is stored without a delta

### Requirement: Feedback bound to its version

Feedback MUST remain associated with the version it was written for and MUST appear in that version's context.

#### Scenario: Feedback appears on its version

- GIVEN feedback attached to version 2 of a setup
- WHEN the version history is shown
- THEN the feedback appears under version 2

### Requirement: Chronological feedback history

The system MUST show all feedback of a setup in chronological order.

#### Scenario: Entries ordered chronologically

- GIVEN three feedback entries on a setup
- WHEN the feedback history is shown
- THEN the entries appear in chronological order

### Requirement: Feedback ownership

Feedback MUST be visible only to its owner, and only the owner MUST be able to edit or delete it.

#### Scenario: Other users cannot see it

- GIVEN feedback from user A on a setup
- WHEN user B views their own library
- THEN user B never sees user A's feedback

### Requirement: No structured fields

Feedback MUST NOT require structured per-parameter fields (PRD §5: simple by design).

#### Scenario: Only free text and delta offered

- GIVEN the feedback form
- WHEN it is rendered
- THEN it offers only free text and lap delta