import { parseSto, type StoDocument, type StoParseError } from "@pit-wall/sto-parser";

export const DIFF_REGION_KINDS = {
  HEADER: "header",
  PAYLOAD: "payload",
  NOTES: "notes",
  TRAILER: "trailer",
} as const;

export type DiffRegionKind = (typeof DIFF_REGION_KINDS)[keyof typeof DIFF_REGION_KINDS];

export interface DiffRegion {
  kind: DiffRegionKind;
  /** First differing byte offset (0-based, shared file coordinates). */
  start: number;
  /** One past the last differing byte offset. */
  end: number;
  /** Number of differing bytes in this contiguous run. */
  length: number;
}

/** Region layout of one file, derived from the parser's container model. */
export interface StoLayout {
  /** Total file length in bytes. */
  length: number;
  /** Declared payload size: payload occupies bytes [8, 8+fs). */
  fs: number;
  /** File offset where the UTF-16LE notes text suffix of the payload starts. */
  notesStart: number;
  /** File offset where the trailer starts (8 + fs). */
  trailerStart: number;
  /** Raw byte length of the notes region. */
  notesRawLength: number;
}

export interface StoByteDiff {
  layoutA: StoLayout;
  layoutB: StoLayout;
  /** True when both files share fs and notes raw length (region sizes match). */
  sameLayout: boolean;
  /** True when both files have the same total byte length. */
  sameLength: boolean;
  /** Contiguous differing runs, classified by region kind, in file order. */
  regions: DiffRegion[];
  headerDiffCount: number;
  payloadDiffCount: number;
  notesDiffCount: number;
  trailerDiffCount: number;
}

export type ByteDiffResult =
  | { ok: true; diff: StoByteDiff }
  | { ok: false; error: StoParseError };

/** Container header prefix: magic (0x0003) + declared payload size (fs). */
const HEADER_PREFIX_LENGTH = 8;

function layoutOf(bytes: Uint8Array, document: StoDocument): StoLayout {
  const trailerStart = HEADER_PREFIX_LENGTH + document.header.fs;
  return {
    length: bytes.length,
    fs: document.header.fs,
    notesStart: trailerStart - document.notes.raw.length,
    trailerStart,
    notesRawLength: document.notes.raw.length,
  };
}

/**
 * Classifies a differing run by the region it starts in, using the strictest
 * of the two file layouts: a run is `notes` only when it starts inside the
 * notes span of BOTH files, and `trailer` only when it starts inside the
 * trailer span of BOTH files. Runs straddling a payload/notes boundary are
 * reported as payload.
 */
function classifyRun(start: number, layoutA: StoLayout, layoutB: StoLayout): DiffRegionKind {
  if (start < HEADER_PREFIX_LENGTH) {
    return DIFF_REGION_KINDS.HEADER;
  }
  if (start >= Math.max(layoutA.trailerStart, layoutB.trailerStart)) {
    return DIFF_REGION_KINDS.TRAILER;
  }
  if (start >= Math.max(layoutA.notesStart, layoutB.notesStart)) {
    return DIFF_REGION_KINDS.NOTES;
  }
  return DIFF_REGION_KINDS.PAYLOAD;
}

/**
 * D3 byte-diff RE harness: reports byte-level differences between two .sto
 * files localized by region (header / payload / notes / trailer). In-memory
 * only: inputs are never mutated and no file writes exist. Malformed inputs
 * yield a typed parse error, never a raw exception.
 */
export function byteDiff(bytesA: Uint8Array, bytesB: Uint8Array): ByteDiffResult {
  const parsedA = parseSto(bytesA);
  if (!parsedA.ok) {
    return parsedA;
  }
  const parsedB = parseSto(bytesB);
  if (!parsedB.ok) {
    return parsedB;
  }
  const layoutA = layoutOf(bytesA, parsedA.document);
  const layoutB = layoutOf(bytesB, parsedB.document);

  const commonEnd = Math.min(layoutA.length, layoutB.length);
  const runs: Array<{ start: number; end: number }> = [];
  let runStart = -1;
  for (let i = 0; i < commonEnd; i++) {
    const differ = bytesA[i]! !== bytesB[i]!;
    if (differ && runStart < 0) {
      runStart = i;
    } else if (!differ && runStart >= 0) {
      runs.push({ start: runStart, end: i });
      runStart = -1;
    }
  }
  if (runStart >= 0) {
    runs.push({ start: runStart, end: commonEnd });
  }

  const regions: DiffRegion[] = runs.map((run) => {
    const kind = classifyRun(run.start, layoutA, layoutB);
    return { kind, start: run.start, end: run.end, length: run.end - run.start };
  });

  return {
    ok: true,
    diff: {
      layoutA,
      layoutB,
      sameLayout: layoutA.fs === layoutB.fs && layoutA.notesRawLength === layoutB.notesRawLength,
      sameLength: layoutA.length === layoutB.length,
      regions,
      headerDiffCount: regions.filter((region) => region.kind === DIFF_REGION_KINDS.HEADER).length,
      payloadDiffCount: regions.filter((region) => region.kind === DIFF_REGION_KINDS.PAYLOAD).length,
      notesDiffCount: regions.filter((region) => region.kind === DIFF_REGION_KINDS.NOTES).length,
      trailerDiffCount: regions.filter((region) => region.kind === DIFF_REGION_KINDS.TRAILER).length,
    },
  };
}