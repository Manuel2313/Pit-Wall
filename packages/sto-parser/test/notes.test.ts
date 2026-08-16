import { describe, expect, it } from "vitest";
import { encodeNotes, extractNotes, validateTrailer } from "../src/notes";
import { readSto } from "./helpers";

const V1 = "lemans_FerrariGT3_Claude_V1.sto";
const WATKINS = "watkinglens.sto";

function payloadOf(file: string, fs: number): Uint8Array {
  return readSto(file).subarray(8, 8 + fs);
}

describe("notes codec, pinned by golden tests on real fixtures (D6)", () => {
  it("decodes the real V1 notes to the golden plain text (8090 chars)", () => {
    const { raw, text } = extractNotes(payloadOf(V1, 18158));
    expect(raw).toHaveLength(16182); // 8090 chars UTF-16LE + NUL terminator pair
    expect(text).toHaveLength(8090);
    expect(text.startsWith("If the setup fails tech inspection, it is likely the ride heights requ")).toBe(true);
    expect(text.endsWith("less on throttle oversteer.\r")).toBe(true);
  });

  it("re-encodes the decoded V1 text to the exact original raw bytes (encode inverse)", () => {
    const { raw, text } = extractNotes(payloadOf(V1, 18158));
    expect(encodeNotes(text)).toEqual(raw);
  });

  it("decodes the Porsche Cup notes as a different golden text (5352 chars)", () => {
    const { raw, text } = extractNotes(payloadOf(WATKINS, 12586));
    expect(raw).toHaveLength(10706);
    expect(text).toHaveLength(5352);
    expect(text.startsWith("In the iRacing Setups folder you will find a variety of default setups")).toBe(true);
    expect(text.endsWith("slower overall response to inputs.")).toBe(true);
    expect(encodeNotes(text)).toEqual(raw);
  });

  it("rejects a trailer that does not end with the 8 zero bytes as trailer-invalid", () => {
    const bytes = new Uint8Array(32).fill(0xaa); // fs 16 -> trailer [24..32)
    bytes[0] = 0x03;
    expect(validateTrailer(bytes, 16)).toEqual({
      ok: false,
      error: { kind: "trailer-invalid", offset: 24 },
    });
  });

  it("rejects a trailer shorter than 8 bytes as truncated", () => {
    const bytes = new Uint8Array(28).fill(0); // fs 16 -> trailer [24..28)
    bytes[0] = 0x03;
    expect(validateTrailer(bytes, 16)).toEqual({
      ok: false,
      error: { kind: "truncated", offset: 24 },
    });
  });
});