import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { flipBytes } from "../src/mutator";
import { FIXTURES_DIR } from "../src/fixtures";

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

const SAMPLE = new Uint8Array([
  0x00, 0x03, 0x00, 0x00, 0xee, 0x46, 0x00, 0x00, 0x30, 0x01, 0x02, 0xff, 0x80, 0x7f, 0x0a, 0x00,
]);

describe("mutator (spec: D3 deterministic offset flips, in-memory only, no writes)", () => {
  it("same seed produces the identical bytes and flip list (determinism)", () => {
    const first = flipBytes(SAMPLE, 42, 5);
    const second = flipBytes(SAMPLE, 42, 5);
    expect(second.bytes).toEqual(first.bytes);
    expect(second.flips).toEqual(first.flips);
    expect(first.flips).toHaveLength(5);
  });

  it("different seeds produce different flip sequences", () => {
    const fromSeed1 = flipBytes(SAMPLE, 1, 3).flips;
    const fromSeed2 = flipBytes(SAMPLE, 2, 3).flips;
    expect(fromSeed1.map((flip) => flip.offset)).not.toEqual(
      fromSeed2.map((flip) => flip.offset),
    );
  });

  it("produces exactly the requested number of distinct in-range flips", () => {
    const result = flipBytes(SAMPLE, 7, 5);
    expect(result.flips).toHaveLength(5);
    const offsets = new Set(result.flips.map((flip) => flip.offset));
    expect(offsets.size).toBe(5);
    for (const flip of result.flips) {
      expect(flip.offset).toBeGreaterThanOrEqual(0);
      expect(flip.offset).toBeLessThan(SAMPLE.length);
    }
  });

  it("each flip toggles exactly one bit of the original byte at its offset", () => {
    const result = flipBytes(SAMPLE, 7, 5);
    for (const flip of result.flips) {
      expect(flip.from).toBe(SAMPLE[flip.offset]);
      expect(result.bytes[flip.offset]).toBe(flip.to);
      expect(flip.to).not.toBe(flip.from);
      const xor = flip.from ^ flip.to;
      expect(xor).toBeGreaterThan(0);
      expect(xor).toBeLessThan(256);
      expect(xor & (xor - 1)).toBe(0);
    }
  });

  it("never mutates its input and returns a fresh buffer (D3 in-memory)", () => {
    const snapshot = new Uint8Array(SAMPLE);
    const result = flipBytes(SAMPLE, 99, 4);
    expect(result.bytes).not.toBe(SAMPLE);
    expect(SAMPLE).toEqual(snapshot);
    expect(result.bytes).toHaveLength(SAMPLE.length);
  });

  it("never writes to fixtures: IRacingSetups hash is unchanged after a mutation run", () => {
    const v1Path = join(FIXTURES_DIR, "lemans_FerrariGT3_Claude_V1.sto");
    const before = sha256Hex(readFileSync(v1Path));
    const bytes = readFileSync(v1Path);
    const result = flipBytes(bytes, 1234, 16);
    expect(result.flips).toHaveLength(16);
    expect(sha256Hex(readFileSync(v1Path))).toBe(before);
  });

  it("returns an empty flip list for empty input and for a zero flip count", () => {
    const empty = flipBytes(new Uint8Array(), 1, 5);
    expect(empty.bytes).toHaveLength(0);
    expect(empty.flips).toEqual([]);
    const zero = flipBytes(SAMPLE, 1, 0);
    expect(zero.bytes).toEqual(SAMPLE);
    expect(zero.flips).toEqual([]);
  });

  it("caps the flip count at the buffer length (distinct offsets only)", () => {
    const tiny = new Uint8Array([7, 9]);
    const result = flipBytes(tiny, 3, 5);
    expect(result.flips).toHaveLength(2);
    expect(new Set(result.flips.map((flip) => flip.offset)).size).toBe(2);
    expect(result.bytes).toHaveLength(2);
  });
});