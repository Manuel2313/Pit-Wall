import { fileURLToPath } from "node:url";

export const FIXTURE_ROLES = {
  DIFF_PAIR: "diff-pair",
  ORACLE_SOURCE: "oracle-source",
} as const;

export type FixtureRole = (typeof FIXTURE_ROLES)[keyof typeof FIXTURE_ROLES];

export interface FixtureCar {
  make: string;
  model: string;
}

export interface StoFixture {
  id: string;
  /** File name inside the read-only IRacingSetups/ directory. */
  file: string;
  car: FixtureCar;
  /** Stable distinct-car label used by the acceptance gate (PRD v0.4: >=4 distinct cars). */
  carKey: string;
  /** Track inferred from the file name; null when the name carries no track. */
  track: string | null;
  /** Setup version suffix (V1/V2); null when the file name has no version. */
  variant: string | null;
  /** D5: V1/V2 are a diff pair; the rest are oracle sources. */
  role: FixtureRole;
  /** Real byte size measured from the committed fixture. */
  sizeBytes: number;
  /** SHA-256 pin of the committed fixture bytes (immutability check). */
  sha256: string;
}

/** Absolute path of the read-only fixture directory (repo root/IRacingSetups). */
export const FIXTURES_DIR: string = fileURLToPath(
  new URL("../../../IRacingSetups/", import.meta.url),
);

const RAW_FIXTURES = [
  {
    id: "ferrari-gt3-v1",
    file: "lemans_FerrariGT3_Claude_V1.sto",
    car: { make: "Ferrari", model: "GT3" },
    carKey: "Ferrari",
    track: "Le Mans",
    variant: "V1",
    role: FIXTURE_ROLES.DIFF_PAIR,
    sizeBytes: 18174,
    sha256: "3d0d9b5c75d09ba98b7f9c60443655582474194a4a310d00d8adac0fce0cd719",
  },
  {
    id: "ferrari-gt3-v2",
    file: "lemans_FerrariGT3_Claude_V2.sto",
    car: { make: "Ferrari", model: "GT3" },
    carKey: "Ferrari",
    track: "Le Mans",
    variant: "V2",
    role: FIXTURE_ROLES.DIFF_PAIR,
    sizeBytes: 18174,
    sha256: "a08f6b0419117b4f17c5c1d53eac105cbde204fad5f62d9d3b4a5b800b6b7000",
  },
  {
    id: "mustang-gt3",
    file: "Mustang GT3.sto",
    car: { make: "Ford", model: "Mustang GT3" },
    carKey: "Mustang",
    track: null,
    variant: null,
    role: FIXTURE_ROLES.ORACLE_SOURCE,
    sizeBytes: 18110,
    sha256: "3af7164ce75026bc8aec4b3fff7754e34a7285639e8fc770a2703e765874b69d",
  },
  {
    id: "mercedes-gt3-spa",
    file: "Spa_GT3_mercho_Claude_V1.sto",
    car: { make: "Mercedes-AMG", model: "GT3" },
    carKey: "Mercedes",
    track: "Spa",
    variant: "V1",
    role: FIXTURE_ROLES.ORACLE_SOURCE,
    sizeBytes: 18390,
    sha256: "b030f768dad881325eb3ec7c20600ea41299e4ecbca3d680bcc5a9818e47e952",
  },
  {
    id: "porsche-cup-watkins-glen",
    file: "watkinglens.sto",
    car: { make: "Porsche", model: "911 GT3 Cup (992)" },
    carKey: "Porsche Cup",
    track: "Watkins Glen",
    variant: null,
    role: FIXTURE_ROLES.ORACLE_SOURCE,
    sizeBytes: 12602,
    sha256: "bfc0fee17368cea4979d87a34df4fb7fd7b939c46da41ae6f380b91b789008d5",
  },
] satisfies StoFixture[];

/** Read-only registry: entries and the list itself are frozen. No write path exists. */
export const FIXTURES: readonly StoFixture[] = Object.freeze(
  RAW_FIXTURES.map((entry) => Object.freeze(entry)),
);

export function listFixtures(): readonly StoFixture[] {
  return FIXTURES;
}

export function distinctCars(): string[] {
  return [...new Set(FIXTURES.map((fixture) => fixture.carKey))];
}