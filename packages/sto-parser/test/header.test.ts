import { describe, expect, it } from "vitest";
import { parseHeader } from "../src/header";
import { readSto } from "./helpers";

/** Builds a synthetic container buffer: magic 0x0003, fs, then filler. */
function synthetic(fs: number, len: number, filler: number): Uint8Array {
  const bytes = new Uint8Array(len);
  bytes.set([0x03, 0x00, 0x00, 0x00], 0);
  bytes[4] = fs & 0xff;
  bytes[5] = (fs >>> 8) & 0xff;
  bytes[6] = (fs >>> 16) & 0xff;
  bytes[7] = (fs >>> 24) & 0xff;
  bytes.fill(filler, 8);
  return bytes;
}

describe("header contract (D2)", () => {
  it("parses the real Ferrari V1 header with golden field values", () => {
    const result = parseHeader(readSto("lemans_FerrariGT3_Claude_V1.sto"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.header).toEqual({ magic: 3, fs: 18158, reserved1: 1936, reserved2: 16182 });
  });

  it("parses the Ferrari V2 header identically (diff pair shares the 16-byte header)", () => {
    const result = parseHeader(readSto("lemans_FerrariGT3_Claude_V2.sto"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.header).toEqual({ magic: 3, fs: 18158, reserved1: 1936, reserved2: 16182 });
  });

  it("rejects a buffer whose magic is not 0x0003 as invalid-magic at offset 0", () => {
    const bytes = synthetic(10, 100, 0xaa);
    bytes[0] = 0x04;
    expect(parseHeader(bytes)).toEqual({
      ok: false,
      error: { kind: "invalid-magic", offset: 0 },
    });
  });

  it("rejects a non-canonical fs with an unterminated trailer as size-mismatch at offset 4", () => {
    // fs 10 != len-16 (84) and the trailer bytes [18..100) are not terminated
    expect(parseHeader(synthetic(10, 100, 0xaa))).toEqual({
      ok: false,
      error: { kind: "size-mismatch", offset: 4 },
    });
  });

  it("rejects a buffer too short to hold the magic as truncated at offset 0", () => {
    expect(parseHeader(new Uint8Array([0x03, 0x00]))).toEqual({
      ok: false,
      error: { kind: "truncated", offset: 0 },
    });
  });
});