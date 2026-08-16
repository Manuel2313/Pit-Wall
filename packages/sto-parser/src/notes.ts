import { createParseError, type StoParseError } from "./errors";
import { endsWithZeros } from "./header";

export interface NotesSection {
  /** Exact trailer bytes as found in the payload (text + NUL terminator), for byte-identical round-trip. */
  raw: Uint8Array;
  /** Plain UTF-16LE text with the NUL terminator stripped. */
  text: string;
}

export type TrailerResult =
  | { ok: true; trailer: Uint8Array }
  | { ok: false; error: StoParseError };

const TEXT_DECODER = new TextDecoder("utf-16le");

/** A UTF-16LE code unit counts as notes text when it is a Latin-1 printable/whitespace char. */
function isTextPair(lo: number, hi: number): boolean {
  return (
    hi === 0 &&
    ((lo >= 0x20 && lo <= 0x7e) || (lo >= 0xa0 && lo <= 0xff) || lo === 0x09 || lo === 0x0a || lo === 0x0d)
  );
}

/**
 * Extracts the notes section from the payload: the longest UTF-16LE text
 * suffix (real fixtures: 8090 chars GT3 / 5352 Porsche), terminated by one or
 * more NUL pairs. raw keeps the NUL terminator; text is the decoded plain text.
 */
export function extractNotes(payload: Uint8Array): NotesSection {
  let textEnd = payload.length;
  while (textEnd >= 2 && payload[textEnd - 2] === 0 && payload[textEnd - 1] === 0) {
    textEnd -= 2;
  }
  let start = textEnd;
  while (start >= 2 && isTextPair(payload[start - 2]!, payload[start - 1]!)) {
    start -= 2;
  }
  return {
    raw: payload.subarray(start),
    text: TEXT_DECODER.decode(payload.subarray(start, textEnd)),
  };
}

/** Encodes plain text back to UTF-16LE plus a single NUL terminator pair (exact inverse of extractNotes). */
export function encodeNotes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length * 2 + 2);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    bytes[i * 2] = code & 0xff;
    bytes[i * 2 + 1] = code >>> 8;
  }
  return bytes;
}

/**
 * Validates the trailer region (bytes after the fs-sized payload): it must be
 * at least 8 bytes and end with the 8 zero-byte terminator.
 */
export function validateTrailer(bytes: Uint8Array, fs: number): TrailerResult {
  const trailer = bytes.subarray(8 + fs);
  if (trailer.length < 8) {
    return { ok: false, error: createParseError("truncated", 8 + fs) };
  }
  if (!endsWithZeros(trailer, 8)) {
    return { ok: false, error: createParseError("trailer-invalid", 8 + fs) };
  }
  return { ok: true, trailer };
}