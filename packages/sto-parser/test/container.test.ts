import { describe, expect, it } from "vitest";
import { parseSto, serializeSto } from "../src/container";
import { readSto } from "./helpers";

const V1 = "lemans_FerrariGT3_Claude_V1.sto";
const V2 = "lemans_FerrariGT3_Claude_V2.sto";
const SPA = "Spa_GT3_mercho_Claude_V1.sto";
const WATKINS = "watkinglens.sto";

describe("container parseSto (spec: Real Ferrari fixture parses)", () => {
  it("parses the real Ferrari V1 into header, payload, trailer and notes sections", () => {
    const bytes = readSto(V1);
    const result = parseSto(bytes);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { document } = result;
    expect(document.header).toEqual({ magic: 3, fs: 18158, reserved1: 1936, reserved2: 16182 });
    expect(document.payload).toEqual(bytes.subarray(8, 8 + 18158));
    expect([...document.trailer]).toEqual(new Array(8).fill(0));
    expect(document.notes.text).toHaveLength(8090);
    expect(document.overlay).toBeNull();
  });

  it("never mutates the input bytes", () => {
    const bytes = readSto(V1);
    const before = [...bytes];
    parseSto(bytes);
    expect([...bytes]).toEqual(before);
  });

  it("rejects a truncated real Ferrari as truncated at offset 4", () => {
    const sliced = readSto(V1).subarray(0, 10000);
    expect(parseSto(sliced)).toEqual({
      ok: false,
      error: { kind: "truncated", offset: 4 },
    });
  });

  it("parses the Spa fixture with its 80-byte record trailer (non-canonical fs is legal when terminated)", () => {
    const bytes = readSto(SPA);
    const result = parseSto(bytes);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { document } = result;
    expect(document.header.fs).toBe(18302);
    expect(document.trailer).toHaveLength(80);
    expect([...document.trailer.slice(-8)]).toEqual(new Array(8).fill(0));
    expect(document.notes.text).toHaveLength(8090);
  });

  it("parses the Porsche Cup fixture with its smaller payload (12586 bytes)", () => {
    const result = parseSto(readSto(WATKINS));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.payload).toHaveLength(12586);
    expect(result.document.notes.text).toHaveLength(5352);
  });

  it("serializes a parsed V1 document back to the exact original bytes", () => {
    const bytes = readSto(V1);
    const result = parseSto(bytes);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(serializeSto(result.document)).toEqual(bytes);
  });

  it("serializes the V2 document back to its own distinct bytes", () => {
    const bytes = readSto(V2);
    const result = parseSto(bytes);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(serializeSto(result.document)).toEqual(bytes);
  });
});