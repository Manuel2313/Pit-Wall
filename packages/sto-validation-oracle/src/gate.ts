import { FIXTURES, type StoFixture } from "./fixtures";

/** PRD §6 acceptance / §10 fase 0: the suite must not report green below 4 distinct cars. */
export const GATE_MIN_CARS = 4;

export interface GateResult {
  /** True only when at least GATE_MIN_CARS distinct cars are registered. */
  met: boolean;
  /** Current number of distinct cars (unique carKey values). */
  distinctCars: number;
  /** How many more distinct cars are required to meet the gate. */
  missing: number;
}

/** Registry-driven acceptance gate (design.md: Gate row); pure, no file access. */
export function validateGate(fixtures: readonly StoFixture[] = FIXTURES): GateResult {
  const distinctCars = new Set(fixtures.map((fixture) => fixture.carKey)).size;
  const missing = Math.max(0, GATE_MIN_CARS - distinctCars);
  return {
    met: distinctCars >= GATE_MIN_CARS,
    distinctCars,
    missing,
  };
}