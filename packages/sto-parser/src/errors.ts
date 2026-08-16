/** D4: typed parse errors — parseSto never throws for expected failures. */
export const ERROR_KINDS = [
  "invalid-magic",
  "size-mismatch",
  "truncated",
  "trailer-invalid",
] as const;

export type StoErrorKind = (typeof ERROR_KINDS)[number];

/** A typed parse failure with the byte offset where the problem was detected. */
export interface StoParseError {
  kind: StoErrorKind;
  offset: number;
}

export function createParseError(kind: StoErrorKind, offset: number): StoParseError {
  return { kind, offset };
}