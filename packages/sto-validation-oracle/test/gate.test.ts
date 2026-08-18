import { describe, expect, it } from "vitest";
import { FIXTURE_ROLES, type StoFixture } from "../src/fixtures";
import { GATE_MIN_CARS, validateGate } from "../src/gate";

/** Builds a synthetic registry entry for gate tests (no disk access needed). */
function syntheticFixture(carKey: string, id: string): StoFixture {
  return {
    id,
    file: `${id}.sto`,
    car: { make: carKey, model: "GT3" },
    carKey,
    track: null,
    variant: null,
    role: FIXTURE_ROLES.ORACLE_SOURCE,
    sizeBytes: 1,
    sha256: "0".repeat(64),
  };
}

function registryWithCars(carKeys: readonly string[]): StoFixture[] {
  return carKeys.map((carKey, index) => syntheticFixture(carKey, `fixture-${index}`));
}

describe("acceptance gate (spec: Gate unmet / Gate met, PRD v0.4 >=4 distinct cars)", () => {
  it("reports the real registry (4 distinct cars) as met", () => {
    const result = validateGate();
    expect(result.met).toBe(true);
    expect(result.distinctCars).toBe(4);
    expect(result.missing).toBe(0);
  });

  it("counts same-car versions (V1/V2 diff pair) as one distinct car", () => {
    const result = validateGate(
      registryWithCars(["Ferrari", "Ferrari", "Mustang", "Mercedes", "Porsche Cup"]),
    );
    expect(result.met).toBe(true);
    expect(result.distinctCars).toBe(4);
    expect(result.missing).toBe(0);
  });

  it("never reports the gate met while fewer than 4 distinct cars are registered", () => {
    for (const count of [1, 2, 3]) {
      const cars = Array.from({ length: count }, (_, index) => `Car ${index + 1}`);
      const result = validateGate(registryWithCars(cars));
      expect(result.met).toBe(false);
      expect(result.distinctCars).toBe(count);
      expect(result.missing).toBe(GATE_MIN_CARS - count);
    }
  });

  it("reports the gate met exactly when 4 distinct cars are registered", () => {
    const result = validateGate(
      registryWithCars(["Ferrari", "Mustang", "Mercedes", "Porsche Cup"]),
    );
    expect(result.met).toBe(true);
    expect(result.distinctCars).toBe(4);
    expect(result.missing).toBe(0);
  });
});
