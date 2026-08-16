import { safeParseCarSetup, type CarSetup } from "./overlay";

/**
 * Typed CarSetup overlay built from the official iRacing HTML export (.htm),
 * NOT from the .sto bytes (whose payload is encrypted by iRacing).
 * Field-for-field mapping is pinned by golden tests on fixed_ferrariGT3296.htm.
 */

/** One `Label:<U>value</U>` pair inside a `<H2><U>SECTION:</U></H2>` block. */
export interface HtmlFieldPair {
  section: string;
  label: string;
  value: string;
}

const FERRARI_296_MARKER = /ferrari296gt3/i;

const SECTION_RE = /<H2><U>([^<]+)<\/U><\/H2>([\s\S]*?)(?=<H2|<body|$)/g;
const FIELD_RE = /([^<>\n]+?):<U>([^<]+)<\/U>/g;

/** Low-level extraction: ordered field pairs per section, in document order. */
export function extractHtmlFieldPairs(html: string): HtmlFieldPair[] {
  const pairs: HtmlFieldPair[] = [];
  let sectionMatch: RegExpExecArray | null;
  SECTION_RE.lastIndex = 0;
  while ((sectionMatch = SECTION_RE.exec(html)) !== null) {
    const section = sectionMatch[1] as string;
    const content = sectionMatch[2] as string;
    let fieldMatch: RegExpExecArray | null;
    FIELD_RE.lastIndex = 0;
    while ((fieldMatch = FIELD_RE.exec(content)) !== null) {
      pairs.push({ section, label: fieldMatch[1] as string, value: fieldMatch[2] as string });
    }
  }
  return pairs;
}

type Corner = "LF" | "LR" | "RF" | "RR";

function cornerOf(section: string): Corner | null {
  switch (section) {
    case "LEFT FRONT:":
      return "LF";
    case "LEFT REAR:":
      return "LR";
    case "RIGHT FRONT:":
      return "RF";
    case "RIGHT REAR:":
      return "RR";
    default:
      return null;
  }
}

const axisOf = (corner: Corner): "Front" | "Rear" =>
  corner === "LF" || corner === "RF" ? "Front" : "Rear";

/** Maps an extracted pair to its canonical CarSetup YAML name and category. */
export function resolveFieldPair(pair: HtmlFieldPair): { category: string; name: string } | null {
  const corner = cornerOf(pair.section);
  if (corner !== null) {
    const axis = axisOf(corner);
    switch (pair.label) {
      case "Starting pressure":
        return { category: "tires", name: `StartingPressure${corner}` };
      case "Camber":
        return { category: "suspension", name: `${axis}Camber${corner}` };
      case "Ride height":
        return { category: "suspension", name: `${axis}RideHeight${corner}` };
      case "Spring rate":
        return { category: "suspension", name: `${axis}SpringRate${corner}` };
      case "Toe-in":
        return { category: "suspension", name: `RearToeIn${corner}` };
      default:
        return null;
    }
  }
  switch (pair.section) {
    case "FRONT, BRAKES, LIGHTS:":
      if (pair.label === "ARB blades") return { category: "suspension", name: "FrontArbBlades" };
      if (pair.label === "ARB options") return { category: "suspension", name: "FrontArbOption" };
      if (pair.label === "Total toe-in") return { category: "suspension", name: "FrontToeIn" };
      return null;
    case "REAR:":
      if (pair.label === "ARB blades") return { category: "suspension", name: "RearArbBlades" };
      if (pair.label === "ARB options") return { category: "suspension", name: "RearArbOption" };
      if (pair.label === "Rear Wing Angle") return { category: "aero", name: "RearWingAngle" };
      return null;
    case "AERO BALANCE CALC:":
      if (pair.label === "Rear Wing Angle") return { category: "aero", name: "RearWingAngle" };
      if (pair.label === "Front RH at speed") return { category: "aero", name: "FrontRideHeightAtSpeed" };
      if (pair.label === "Rear RH at speed") return { category: "aero", name: "RearRideHeightAtSpeed" };
      if (pair.label === "% Front downforce") return { category: "aero", name: "FrontDownforcePercentage" };
      return null;
    case "GEARS / DIFFERENTIAL:":
      if (pair.label === "Diff preload") return { category: "differential", name: "DiffPreload" };
      if (pair.label === "Friction Faces") return { category: "differential", name: "FrictionFaces" };
      if (pair.label === "Gear stack") return { category: "differential", name: "GearStack" };
      return null;
    default:
      return null;
  }
}

/**
 * Builds the typed Ferrari 296 CarSetup overlay from the official iRacing HTML
 * export. Unknown car or unrecognizable content -> null (raw fallback, no
 * fabricated values; D4). Values keep their units as strings.
 */
export function parseFerrariSetupHtml(html: string): CarSetup | null {
  if (!FERRARI_296_MARKER.test(html)) {
    return null;
  }
  const categories: Record<string, Record<string, string>> = {};
  for (const pair of extractHtmlFieldPairs(html)) {
    const resolved = resolveFieldPair(pair);
    if (resolved === null) {
      continue;
    }
    const category = (categories[resolved.category] ??= {});
    category[resolved.name] = pair.value;
  }
  if (Object.keys(categories).length === 0) {
    return null;
  }
  return safeParseCarSetup({ categories });
}