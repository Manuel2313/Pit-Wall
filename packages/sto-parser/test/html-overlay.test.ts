import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { FIXTURES_DIR } from "./helpers";
import { parseFerrariSetupHtml } from "../src/html-overlay";

const FERRARI_HTML: string = readFileSync(
  `${FIXTURES_DIR}/fixed_ferrariGT3296.htm`,
  "utf8",
);

describe("html-overlay (spec: Known car yields typed values)", () => {
  it("parses the official Ferrari 296 export into a typed CarSetup", () => {
    const setup = parseFerrariSetupHtml(FERRARI_HTML);
    expect(setup).not.toBeNull();
    if (setup === null) return;
    expect(Object.keys(setup.categories).sort()).toEqual([
      "aero",
      "differential",
      "suspension",
      "tires",
    ]);
  });

  it("reads the four starting tire pressures field-for-field", () => {
    const setup = parseFerrariSetupHtml(FERRARI_HTML);
    expect(setup).not.toBeNull();
    if (setup === null) return;
    const tires = setup.categories["tires"];
    expect(tires?.["StartingPressureLF"]).toBe("159 kPa");
    expect(tires?.["StartingPressureLR"]).toBe("159 kPa");
    expect(tires?.["StartingPressureRF"]).toBe("159 kPa");
    expect(tires?.["StartingPressureRR"]).toBe("159 kPa");
  });

  it("reads camber per corner (front -4.0 deg, rear -3.3 deg)", () => {
    const setup = parseFerrariSetupHtml(FERRARI_HTML);
    expect(setup).not.toBeNull();
    if (setup === null) return;
    const suspension = setup.categories["suspension"];
    expect(suspension?.["FrontCamberLF"]).toBe("-4.0 deg");
    expect(suspension?.["FrontCamberRF"]).toBe("-4.0 deg");
    expect(suspension?.["RearCamberLR"]).toBe("-3.3 deg");
    expect(suspension?.["RearCamberRR"]).toBe("-3.3 deg");
  });

  it("reads ride heights per corner (front 53.1 mm, rear 62.3 mm)", () => {
    const setup = parseFerrariSetupHtml(FERRARI_HTML);
    expect(setup).not.toBeNull();
    if (setup === null) return;
    const suspension = setup.categories["suspension"];
    expect(suspension?.["FrontRideHeightLF"]).toBe("53.1 mm");
    expect(suspension?.["FrontRideHeightRF"]).toBe("53.1 mm");
    expect(suspension?.["RearRideHeightLR"]).toBe("62.3 mm");
    expect(suspension?.["RearRideHeightRR"]).toBe("62.3 mm");
  });

  it("reads spring rates per corner (front 250 N/mm, rear 190 N/mm)", () => {
    const setup = parseFerrariSetupHtml(FERRARI_HTML);
    expect(setup).not.toBeNull();
    if (setup === null) return;
    const suspension = setup.categories["suspension"];
    expect(suspension?.["FrontSpringRateLF"]).toBe("250 N/mm");
    expect(suspension?.["FrontSpringRateRF"]).toBe("250 N/mm");
    expect(suspension?.["RearSpringRateLR"]).toBe("190 N/mm");
    expect(suspension?.["RearSpringRateRR"]).toBe("190 N/mm");
  });

  it("reads ARB blades/options and toe from the front and rear sections", () => {
    const setup = parseFerrariSetupHtml(FERRARI_HTML);
    expect(setup).not.toBeNull();
    if (setup === null) return;
    const suspension = setup.categories["suspension"];
    expect(suspension?.["FrontArbBlades"]).toBe("75 degrees");
    expect(suspension?.["FrontArbOption"]).toBe("Large");
    expect(suspension?.["RearArbBlades"]).toBe("75 degrees");
    expect(suspension?.["RearArbOption"]).toBe("Small");
    expect(suspension?.["FrontToeIn"]).toBe("-3.0 mm");
    expect(suspension?.["RearToeInLR"]).toBe("+1.5 mm");
    expect(suspension?.["RearToeInRR"]).toBe("+1.5 mm");
  });

  it("reads aero values from the AERO BALANCE CALC and REAR sections", () => {
    const setup = parseFerrariSetupHtml(FERRARI_HTML);
    expect(setup).not.toBeNull();
    if (setup === null) return;
    const aero = setup.categories["aero"];
    expect(aero?.["RearWingAngle"]).toBe("10 degrees");
    expect(aero?.["FrontRideHeightAtSpeed"]).toBe("49 mm");
    expect(aero?.["RearRideHeightAtSpeed"]).toBe("53 mm");
    expect(aero?.["FrontDownforcePercentage"]).toBe("41.6%");
  });

  it("reads differential values from the GEARS / DIFFERENTIAL section", () => {
    const setup = parseFerrariSetupHtml(FERRARI_HTML);
    expect(setup).not.toBeNull();
    if (setup === null) return;
    const differential = setup.categories["differential"];
    expect(differential?.["DiffPreload"]).toBe("110 Nm");
    expect(differential?.["FrictionFaces"]).toBe("10");
    expect(differential?.["GearStack"]).toBe("FIA");
  });

  it("returns null for an unknown car export (raw fallback, no fabricated values)", () => {
    const porsche = FERRARI_HTML.replace(/ferrari296gt3/i, "porsche992cup");
    expect(parseFerrariSetupHtml(porsche)).toBeNull();
  });

  it("returns null for malformed HTML with no recognizable fields", () => {
    expect(parseFerrariSetupHtml("")).toBeNull();
    expect(parseFerrariSetupHtml("<html><body>no setup data</body></html>")).toBeNull();
  });
});