export {
  ERROR_KINDS,
  type StoErrorKind,
  type StoParseError,
} from "./errors";
export {
  type StoHeader,
} from "./header";
export {
  type NotesSection,
} from "./notes";
export {
  parseSto,
  serializeSto,
  type StoDocument,
  type StoParseResult,
} from "./container";
export {
  parseFerrariSetupHtml,
  type HtmlFieldPair,
} from "./html-overlay";
export {
  carSetupSchema,
  safeParseCarSetup,
  type CarSetup,
} from "./overlay";