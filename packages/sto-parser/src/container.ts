import { parseHeader, type StoHeader } from "./header";
import { extractNotes, validateTrailer, type NotesSection } from "./notes";
import type { StoParseError } from "./errors";

export interface StoDocument {
  header: StoHeader;
  /** Payload region bytes[8 .. 8+fs); its first 8 bytes are also exposed as reserved1/reserved2. */
  payload: Uint8Array;
  /** Trailer region bytes[8+fs .. EOF), ending in the 8 zero-byte terminator. */
  trailer: Uint8Array;
  notes: NotesSection;
  /** Typed CarSetup overlay — Phase 4; always null here, raw bytes are preserved regardless. */
  overlay: null;
}

export type StoParseResult =
  | { ok: true; document: StoDocument }
  | { ok: false; error: StoParseError };

/** Parses the container layer; never throws for expected failures (D4) and never mutates the input. */
export function parseSto(bytes: Uint8Array): StoParseResult {
  const headerResult = parseHeader(bytes);
  if (!headerResult.ok) {
    return headerResult;
  }
  const trailerResult = validateTrailer(bytes, headerResult.header.fs);
  if (!trailerResult.ok) {
    return trailerResult;
  }
  const payload = bytes.subarray(8, 8 + headerResult.header.fs);
  return {
    ok: true,
    document: {
      header: headerResult.header,
      payload,
      trailer: trailerResult.trailer,
      notes: extractNotes(payload),
      overlay: null,
    },
  };
}

/**
 * Rebuilds the original bytes: 8-byte magic+fs prefix, then the payload
 * (which contains reserved1/reserved2 at its head) and the trailer verbatim.
 */
export function serializeSto(document: StoDocument): Uint8Array {
  const prefix = new Uint8Array(8);
  new DataView(prefix.buffer).setUint32(0, document.header.magic, true);
  new DataView(prefix.buffer).setUint32(4, document.header.fs, true);
  const out = new Uint8Array(8 + document.payload.length + document.trailer.length);
  out.set(prefix, 0);
  out.set(document.payload, 8);
  out.set(document.trailer, 8 + document.payload.length);
  return out;
}