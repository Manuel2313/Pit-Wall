# setup-library Specification

## Purpose

Personal library of setups (PRD §5, §6): organization by car → track → condition, catalog restricted to GT3 + Porsche Cup, chronological version history, diff between any two versions, tags and side-by-side comparison.

## Requirements

### Requirement: Catalog limited to GT3 and Porsche Cup

The system MUST offer only GT3 and Porsche Cup cars: Ferrari 296 GT3, Mustang GT3, Mercedes-AMG GT3 and Porsche 911 GT3 Cup 992. GT4 MUST NOT be offered.

#### Scenario: Catalog lists only validated cars

- GIVEN the setup library
- WHEN the car catalog is shown
- THEN only the four validated cars appear

#### Scenario: GT4 not offered

- GIVEN a user creating a setup
- WHEN choosing a car
- THEN no GT4 car is available

### Requirement: Organization by car, track and condition

The system MUST let the user organize and filter setups by car, track (with layout) and condition (quali, race, rain, etc.).

#### Scenario: Filter by car

- GIVEN setups for several cars
- WHEN the user filters by one car
- THEN only that car's setups are shown

#### Scenario: Filter by condition

- GIVEN setups with different conditions
- WHEN the user filters by a condition
- THEN only matching setups are shown

### Requirement: Chronological version history

Every setup MUST show its versions in chronological order, each with its version number and date.

#### Scenario: Versions listed in order

- GIVEN a setup with three versions
- WHEN its history is shown
- THEN the versions appear in chronological order with number and date

### Requirement: Diff between any two versions

The user MUST be able to select any two versions and see their diff: only changed fields with old and new values when both have typed data; byte-level differences otherwise.

#### Scenario: Typed diff highlights one change

- GIVEN two versions whose typed data differs in one parameter
- WHEN the diff is shown
- THEN only that parameter appears, with old and new values

#### Scenario: Diff without typed data

- GIVEN two versions without typed data
- WHEN the diff is shown
- THEN byte-level differences are reported instead

### Requirement: Personal tags

The user MAY apply free-text tags to a setup and remove them. Tags MUST be personal.

#### Scenario: Tag applied and removed

- GIVEN a setup owned by the user
- WHEN the user adds a tag and later removes it
- THEN the tag appears after adding and disappears after removal

### Requirement: Side-by-side comparison

The user MUST be able to compare two or more setups side by side.

#### Scenario: Two setups compared

- GIVEN two setups
- WHEN the user selects both for comparison
- THEN both appear side by side

#### Scenario: More than two compared

- GIVEN three setups
- WHEN the user selects all three
- THEN all three appear side by side

### Requirement: Own library only

The library MUST show only the signed-in user's setups.

#### Scenario: Other users' setups hidden

- GIVEN two users with setups
- WHEN one user opens the library
- THEN only that user's setups are listed