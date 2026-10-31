import { readFileSync } from "node:fs";
import { z } from "zod";
import { parseTargetUrl } from "../core/target";

/** The closed-issue labels the hackathon uses as reference answers. */
export const REFERENCE_LABELS = ["invalid", "cannot-reproduce", "confirmed"] as const;
export type ReferenceLabel = (typeof REFERENCE_LABELS)[number];

/** Only the fields the harness needs; any extra fields a dataset carries are kept but ignored. */
export const EvalCaseSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9._-]{1,80}$/, "id must be a short slug (letters, digits, . _ -)"),
    url: z.string().min(1),
    reference: z.enum(REFERENCE_LABELS),
    /** Optional: verify at this commit instead of the default branch when the issue was filed. */
    commit: z.string().optional(),
  })
  .passthrough();
export type EvalCase = z.infer<typeof EvalCaseSchema>;

/** Accepts `{ "cases": [...] }` or a bare array, validates every case, and rejects duplicates. */
export function parseDataset(json: unknown): EvalCase[] {
  const list = Array.isArray(json) ? json : (json as { cases?: unknown })?.cases;
  const cases = z.array(EvalCaseSchema).min(1).parse(list);
  const seen = new Set<string>();
  for (const c of cases) {
    if (seen.has(c.id)) throw new Error(`Duplicate case id: ${c.id}`);
    seen.add(c.id);
    parseTargetUrl(c.url);
  }
  return cases;
}

export function loadDataset(file: string): EvalCase[] {
  return parseDataset(JSON.parse(readFileSync(file, "utf8")));
}
