import { createParseError, type StoParseError } from "./errors";

/** D2 header contract: 4x uint32 LE; magic is validated to 0x0003 before the header is produced. */
export interface StoHeader {
  magic: 3;
  fs: number;
  reserved1: number;
  reserved2: number;
}

export type HeaderResult = { ok: true; header: StoHeader } | { ok: false; error: StoParseError };

const MAGIC = 0x0003;

/** True when the last `count` bytes are all zero. */
export function endsWithZeros(bytes: Uint8Array, count: number): boolean {
  if (bytes.length < count) return false;
  for (let i = bytes.length - count; i < bytes.length; i++) {
    if (bytes[i] !== 0) return false;
  }
  return true;
}

function readU32LE(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}

/**
 * Validates the container header: magic, declared payload size (fs) and the
 * fs-vs-length consistency rule. fs counts the payload bytes starting at
 * offset 8; a canonical file has fs == len - 16 (trailer = 8 zero bytes), but
 * record trailers (Spa) are legal as long as they end in the 8-byte terminator.
 */
export function parseHeader(bytes: Uint8Array): HeaderResult {
  if (bytes.length < 4) {
    return { ok: false, error: createParseError("truncated", 0) };
  }
  if (readU32LE(bytes, 0) !== MAGIC) {
    return { ok: false, error: createParseError("invalid-magic", 0) };
  }
  if (bytes.length < 8) {
    return { ok: false, error: createParseError("truncated", 4) };
  }
  const fs = readU32LE(bytes, 4);
  if (8 + fs > bytes.length) {
    return { ok: false, error: createParseError("truncated", 4) };
  }
  const trailer = bytes.subarray(8 + fs);
  if (fs !== bytes.length - 16 && trailer.length >= 8 && !endsWithZeros(trailer, 8)) {
    return { ok: false, error: createParseError("size-mismatch", 4) };
  }
  return {
    ok: true,
    header: {
      magic: 3,
      fs,
      reserved1: readU32LE(bytes, 8),
      reserved2: readU32LE(bytes, 12),
    },
  };
}