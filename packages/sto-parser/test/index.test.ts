import { describe, expect, it } from "vitest";
import { ERROR_KINDS, parseSto, serializeSto } from "../src/index";
import { readSto } from "./helpers";

describe("public API surface (index)", () => {
  it("round-trips the real V1 through the exported parseSto/serializeSto", () => {
    const bytes = readSto("lemans_FerrariGT3_Claude_V1.sto");
    const result = parseSto(bytes);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(serializeSto(result.document)).toEqual(bytes);
  });

  it("exposes the error taxonomy constants for consumers", () => {
    expect(ERROR_KINDS).toEqual([
      "invalid-magic",
      "size-mismatch",
      "truncated",
      "trailer-invalid",
    ]);
  });
});