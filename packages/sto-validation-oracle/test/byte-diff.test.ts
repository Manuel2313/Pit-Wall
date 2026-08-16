import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { byteDiff } from "../src/byte-diff";
import { FIXTURES_DIR, listFixtures } from "../src/fixtures";

function fixtureBytes(id: string): Uint8Array {
  const fixture = listFixtures().find((entry) => entry.id === id);
  if (!fixture) {
    throw new Error(`unknown fixture id: ${id}`);
  }
  return readFileSync(join(FIXTURES_DIR, fixture.file));
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

describe("byte-diff RE harness (spec: Ferrari V1 vs V2 diff / Different cars diff; D3 in-memory)", () => {
  it("V1 vs V2: zero header diffs, one or more payload regions, identical notes and trailer", () => {
    const result = byteDiff(fixtureBytes("ferrari-gt3-v1"), fixtureBytes("ferrari-gt3-v2"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { diff } = result;
    expect(diff.headerDiffCount).toBe(0);
    expect(diff.payloadDiffCount).toBeGreaterThanOrEqual(1);
    // Real fixture bytes: V1/V2 notes text is identical (same UTF-16LE suffix).
    expect(diff.notesDiffCount).toBe(0);
    // Real fixture bytes: both trailers are the 8 zero-byte terminator.
    expect(diff.trailerDiffCount).toBe(0);
    expect(diff.sameLength).toBe(true);
    expect(diff.sameLayout).toBe(true);
  });

  it("V1 vs V2: golden — 11 contiguous diff runs, all inside the payload data region", () => {
    const result = byteDiff(fixtureBytes("ferrari-gt3-v1"), fixtureBytes("ferrari-gt3-v2"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.diff.regions).toHaveLength(11);
    for (const region of result.diff.regions) {
      expect(region.kind).toBe("payload");
      expect(region.start).toBeGreaterThanOrEqual(8);
    }
  });

  it("Ferrari vs Porsche: header+payload layout diffs, differing notes, structurally identical trailer", () => {
    const result = byteDiff(fixtureBytes("ferrari-gt3-v1"), fixtureBytes("porsche-cup-watkins-glen"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { diff } = result;
    expect(diff.sameLength).toBe(false);
    expect(diff.sameLayout).toBe(false);
    expect(diff.layoutA.fs).toBe(18158);
    expect(diff.layoutB.fs).toBe(12586);
    // Real fixture bytes: the fs field (bytes 4-5) differs -> header diff.
    expect(diff.headerDiffCount).toBeGreaterThanOrEqual(1);
    expect(diff.payloadDiffCount).toBeGreaterThanOrEqual(1);
    // Real fixture bytes: Ferrari and Porsche notes text differs (different raw lengths too).
    expect(diff.notesDiffCount).toBeGreaterThanOrEqual(1);
    // Real fixture bytes: both trailers are the 8 zero-byte terminator -> structurally identical.
    expect(diff.trailerDiffCount).toBe(0);
  });

  it("Ferrari vs Porsche: layout fields expose fs, notes raw length and trailer offsets", () => {
    const result = byteDiff(fixtureBytes("ferrari-gt3-v1"), fixtureBytes("porsche-cup-watkins-glen"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { diff } = result;
    expect(diff.layoutA.notesRawLength).toBe(16182);
    expect(diff.layoutB.notesRawLength).toBe(10706);
    expect(diff.layoutA.notesStart).toBe(8 + 18158 - 16182);
    expect(diff.layoutB.trailerStart).toBe(8 + 12586);
  });

  it("keeps regions sorted, disjoint and inside the shared byte span; kind matches layout spans", () => {
    const result = byteDiff(fixtureBytes("ferrari-gt3-v1"), fixtureBytes("porsche-cup-watkins-glen"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { diff } = result;
    const commonEnd = Math.min(diff.layoutA.length, diff.layoutB.length);
    let previousEnd = -1;
    for (const region of diff.regions) {
      expect(region.start).toBeGreaterThanOrEqual(0);
      expect(region.start).toBeLessThan(region.end);
      expect(region.end).toBeLessThanOrEqual(commonEnd);
      expect(region.length).toBe(region.end - region.start);
      expect(region.start).toBeGreaterThanOrEqual(previousEnd);
      previousEnd = region.end;
    }
    for (const region of diff.regions) {
      if (region.kind === "header") {
        expect(region.start).toBeLessThan(8);
      } else if (region.kind === "trailer") {
        expect(region.start).toBeGreaterThanOrEqual(diff.layoutA.trailerStart);
        expect(region.start).toBeGreaterThanOrEqual(diff.layoutB.trailerStart);
      } else if (region.kind === "notes") {
        expect(region.start).toBeGreaterThanOrEqual(diff.layoutA.notesStart);
        expect(region.start).toBeGreaterThanOrEqual(diff.layoutB.notesStart);
      } else {
        expect(region.start).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("reports zero regions when the two inputs are identical", () => {
    const v1 = fixtureBytes("ferrari-gt3-v1");
    const result = byteDiff(v1, v1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.diff.regions).toEqual([]);
    expect(result.diff.headerDiffCount).toBe(0);
    expect(result.diff.payloadDiffCount).toBe(0);
    expect(result.diff.notesDiffCount).toBe(0);
    expect(result.diff.trailerDiffCount).toBe(0);
    expect(result.diff.sameLength).toBe(true);
    expect(result.diff.sameLayout).toBe(true);
  });

  it("returns a typed parse error instead of throwing for a non-.sto input", () => {
    const invalid = new Uint8Array([1, 2, 3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const result = byteDiff(invalid, fixtureBytes("ferrari-gt3-v1"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid-magic");
  });

  it("never writes to fixtures and never mutates its inputs (D3 in-memory)", () => {
    const v1Path = join(FIXTURES_DIR, "lemans_FerrariGT3_Claude_V1.sto");
    const before = sha256Hex(readFileSync(v1Path));
    const v1 = readFileSync(v1Path);
    const porsche = readFileSync(join(FIXTURES_DIR, "watkinglens.sto"));
    const v1Snapshot = new Uint8Array(v1);
    const porscheSnapshot = new Uint8Array(porsche);
    const result = byteDiff(v1, porsche);
    expect(result.ok).toBe(true);
    expect(new Uint8Array(v1)).toEqual(v1Snapshot);
    expect(new Uint8Array(porsche)).toEqual(porscheSnapshot);
    expect(sha256Hex(readFileSync(v1Path))).toBe(before);
  });
});