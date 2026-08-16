import { z } from "zod";

/**
 * D4: typed CarSetup overlay model — categories of canonical CarSetup YAML
 * names mapped to unit-preserving string values (e.g. "159 kPa", "-4.0 deg").
 */
export const carSetupSchema = z.object({
  categories: z.record(z.string(), z.record(z.string(), z.string())),
});

export type CarSetup = z.infer<typeof carSetupSchema>;

/** Zod 4 safeParse gate: unknown shape or failure -> null, never throws (D4). */
export function safeParseCarSetup(input: unknown): CarSetup | null {
  const result = carSetupSchema.safeParse(input);
  return result.success ? result.data : null;
}