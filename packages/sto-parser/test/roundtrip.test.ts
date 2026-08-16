import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseSto, serializeSto } from "../src/container";
import { readSto } from "./helpers";

/** The 5 registered fixtures, mirroring the read-only IRacingSetups/ registry. */
const FIXTURE_FILES = [
  "lemans_FerrariGT3_Claude_V1.sto",
  "lemans_FerrariGT3_Claude_V2.sto",
  "Mustang GT3.sto",
  "Spa_GT3_mercho_Claude_V1.sto",
  "watkinglens.sto",
] as const;

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

describe("byte-identical round-trip (spec: Byte-identical round-trip)", () => {
  it("reproduces every fixture byte-for-byte: SHA-256(serialize(parse(f))) === SHA-256(f)", () => {
    for (const file of FIXTURE_FILES) {
      const original = readSto(file);
      const result = parseSto(original);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(sha256Hex(serializeSto(result.document))).toBe(sha256Hex(original));
    }
  });

  it("round-trips V1 and V2 to their own bytes and keeps the two outputs distinct", () => {
    const v1 = readSto(FIXTURE_FILES[0]);
    const v2 = readSto(FIXTURE_FILES[1]);
    const result1 = parseSto(v1);
    const result2 = parseSto(v2);
    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    if (!result1.ok || !result2.ok) return;
    const out1 = serializeSto(result1.document);
    const out2 = serializeSto(result2.document);
    expect(sha256Hex(out1)).toBe(sha256Hex(v1));
    expect(sha256Hex(out2)).toBe(sha256Hex(v2));
    expect(sha256Hex(out1)).not.toBe(sha256Hex(out2));
  });

  it("keeps the serialized size equal to the original and the payload length equal to fs", () => {
    for (const file of FIXTURE_FILES) {
      const original = readSto(file);
      const result = parseSto(original);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      const out = serializeSto(result.document);
      expect(out.length).toBe(original.length);
      expect(result.document.payload.length).toBe(result.document.header.fs);
    }
  });
});