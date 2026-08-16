import { describe, expect, it } from "vitest";
import { ERROR_KINDS, createParseError } from "../src/errors";

describe("error taxonomy (D4)", () => {
  it("exposes exactly the four kinds invalid-magic | size-mismatch | truncated | trailer-invalid", () => {
    expect(ERROR_KINDS).toEqual([
      "invalid-magic",
      "size-mismatch",
      "truncated",
      "trailer-invalid",
    ]);
  });

  it("builds a typed parse error carrying its kind and byte offset", () => {
    expect(createParseError("invalid-magic", 0)).toEqual({
      kind: "invalid-magic",
      offset: 0,
    });
  });

  it("builds errors for every kind with the reported offset", () => {
    const cases = [
      ["invalid-magic", 0],
      ["size-mismatch", 4],
      ["truncated", 18166],
      ["trailer-invalid", 8],
    ] as const;
    for (const [kind, offset] of cases) {
      expect(createParseError(kind, offset)).toEqual({ kind, offset });
    }
  });
});