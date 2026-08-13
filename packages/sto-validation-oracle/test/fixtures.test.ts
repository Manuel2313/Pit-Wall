import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FIXTURES_DIR, distinctCars, listFixtures } from "../src/fixtures";

function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

describe("fixture registry (P1 smoke)", () => {
  it("registers the 5 real .sto fixtures and reports 4 distinct cars", () => {
    const fixtures = listFixtures();
    expect(fixtures).toHaveLength(5);
    expect(distinctCars()).toEqual(["Ferrari", "Mustang", "Mercedes", "Porsche Cup"]);
  });

  it("flags the two Ferrari files as same-car versions of the diff pair", () => {
    const ferrari = listFixtures().filter((fixture) => fixture.carKey === "Ferrari");
    expect(ferrari).toHaveLength(2);
    expect(ferrari.map((fixture) => fixture.variant).sort()).toEqual(["V1", "V2"]);
    expect(ferrari.every((fixture) => fixture.role === "diff-pair")).toBe(true);
  });

  it("resolves every registered file on disk with its pinned size", () => {
    for (const fixture of listFixtures()) {
      expect(statSync(join(FIXTURES_DIR, fixture.file)).size).toBe(fixture.sizeBytes);
    }
  });

  it("pins a sha256 that matches the current bytes of every fixture", () => {
    for (const fixture of listFixtures()) {
      const actual = sha256Hex(readFileSync(join(FIXTURES_DIR, fixture.file)));
      expect(actual).toBe(fixture.sha256);
    }
  });

  it("exposes the registry as immutable (no write path)", () => {
    const fixtures = listFixtures();
    expect(Object.isFrozen(fixtures)).toBe(true);
    expect(fixtures.every((fixture) => Object.isFrozen(fixture))).toBe(true);
  });
});