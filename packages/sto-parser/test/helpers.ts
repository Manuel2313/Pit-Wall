import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Absolute path of the read-only fixture directory (repo root/IRacingSetups). */
export const FIXTURES_DIR: string = fileURLToPath(
  new URL("../../../IRacingSetups/", import.meta.url),
);

/** Reads a committed fixture as a fresh Uint8Array (never the cached Buffer). */
export function readSto(file: string): Uint8Array {
  const bytes = readFileSync(`${FIXTURES_DIR}/${file}`);
  return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}