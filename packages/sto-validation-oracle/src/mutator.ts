export interface ByteFlip {
  /** Byte offset that was flipped (0-based). */
  offset: number;
  /** Byte value at the offset before the flip. */
  from: number;
  /** Byte value at the offset after the flip. */
  to: number;
}

export interface FlipResult {
  /** New buffer with the flips applied; the input buffer is never touched. */
  bytes: Uint8Array;
  /** The deterministic flips that were applied, in input order. */
  flips: ByteFlip[];
}

/** mulberry32: tiny deterministic 32-bit PRNG (same seed -> same sequence). */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * D3 deterministic mutator for RE experiments: flips exactly one bit at
 * `flipCount` distinct offsets chosen by a seed-driven PRNG. Same seed always
 * produces the same offsets, bits and results. In-memory only: the input is
 * copied, never mutated, and no file writes exist. When the requested count
 * exceeds the buffer length, every offset is flipped exactly once.
 */
export function flipBytes(bytes: Uint8Array, seed: number, flipCount: number): FlipResult {
  const out = new Uint8Array(bytes);
  const flips: ByteFlip[] = [];
  if (bytes.length === 0 || flipCount <= 0) {
    return { bytes: out, flips };
  }
  const rand = mulberry32(seed);
  const flippedOffsets = new Set<number>();
  const target = Math.min(flipCount, bytes.length);
  while (flippedOffsets.size < target) {
    const offset = Math.floor(rand() * bytes.length);
    if (flippedOffsets.has(offset)) {
      continue;
    }
    flippedOffsets.add(offset);
    const bit = Math.floor(rand() * 8);
    const from = bytes[offset]!;
    const to = from ^ (1 << bit);
    out[offset] = to;
    flips.push({ offset, from, to });
  }
  return { bytes: out, flips };
}