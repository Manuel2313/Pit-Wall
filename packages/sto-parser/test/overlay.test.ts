import { describe, expect, it } from "vitest";
import { safeParseCarSetup } from "../src/overlay";
import { parseSto, serializeSto } from "../src/container";
import { readSto } from "./helpers";

const V1 = "lemans_FerrariGT3_Claude_V1.sto";

describe("overlay safeParse (D4: failure or unknown -> null, raw preserved)", () => {
  it("accepts a valid CarSetup with categories of string values", () => {
    const input: unknown = {
      categories: {
        suspension: { FrontCamberLF: "-4.0 deg", FrontSpringRateLF: "250 N/mm" },
        aero: { RearWingAngle: "10 degrees" },
        differential: { DiffPreload: "110 Nm" },
      },
    };
    expect(safeParseCarSetup(input)).toEqual(input);
  });

  it("rejects non-object input", () => {
    expect(safeParseCarSetup(null)).toBeNull();
    expect(safeParseCarSetup(42)).toBeNull();
    expect(safeParseCarSetup("setup")).toBeNull();
    expect(safeParseCarSetup(undefined)).toBeNull();
  });

  it("rejects a missing or non-record categories field", () => {
    expect(safeParseCarSetup({})).toBeNull();
    expect(safeParseCarSetup({ categories: "nope" })).toBeNull();
    expect(safeParseCarSetup({ categories: { suspension: "nope" } })).toBeNull();
  });

  it("rejects non-string parameter values", () => {
    expect(safeParseCarSetup({ categories: { suspension: { Camber: -4.0 } } })).toBeNull();
    expect(safeParseCarSetup({ categories: { suspension: { Camber: null } } })).toBeNull();
  });

  it("keeps the .sto document an opaque box: overlay stays null and serialize is byte-identical", () => {
    const bytes = readSto(V1);
    const result = parseSto(bytes);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.overlay).toBeNull();
    expect(serializeSto(result.document)).toEqual(bytes);
  });
});