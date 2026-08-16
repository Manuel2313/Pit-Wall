import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseSto } from "@pit-wall/sto-parser";
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

  it("marks the three remaining cars as oracle sources (D5 roles)", () => {
    const oracleSources = listFixtures().filter((fixture) => fixture.role === "oracle-source");
    expect(oracleSources.map((fixture) => fixture.carKey).sort()).toEqual([
      "Mercedes",
      "Mustang",
      "Porsche Cup",
    ]);
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

  it("leaves fixture bytes unchanged after a parser validation run (hash before/after)", () => {
    for (const fixture of listFixtures()) {
      const path = join(FIXTURES_DIR, fixture.file);
      const before = sha256Hex(readFileSync(path));
      const parsed = parseSto(readFileSync(path));
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) continue;
      // Cross-check the registry size pin against the parsed layout: 8-byte prefix + fs payload + trailer.
      expect(parsed.document.header.fs).toBe(fixture.sizeBytes - 8 - parsed.document.trailer.length);
      const after = sha256Hex(readFileSync(path));
      expect(after).toBe(before);
    }
  });
});