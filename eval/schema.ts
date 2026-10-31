import { z } from "zod";

export const ReferenceLabelSchema = z.enum(["invalid", "cannot-reproduce", "confirmed"]);
export type ReferenceLabel = z.infer<typeof ReferenceLabelSchema>;

export const EvalCaseSchema = z.object({
  /** Slug like "sqlmap-6154". */
  id: z.string().min(1),
  /** A github.com issue URL that parseTargetUrl accepts, kind "issue". */
  url: z.string().url(),
  reference: ReferenceLabelSchema,
  /** The EXACT label text on GitHub, e.g. "invalid", "can't reproduce", "works for me", "confirmed", "bug". */
  sourceLabel: z.string().min(1),
  /** Main language of the repo. */
  language: z.string().min(1),
  /** ISO date string. */
  closedAt: z.string().min(1),
  hasStackTrace: z.boolean(),
  hasReproSteps: z.boolean(),
  /** Names a file, function, class or flag. */
  mentionsCode: z.boolean(),
  securityRelated: z.boolean(),
  /** One sentence: why the maintainers' label is right, from the closing comments. */
  why: z.string().min(1),
  /** URL of the maintainer comment or the commit/PR that settled it. */
  closingEvidence: z.string().min(1),
});
export type EvalCase = z.infer<typeof EvalCaseSchema>;

export const DatasetSchema = z.object({
  version: z.literal(1),
  createdAt: z.string().min(1),
  cases: z.array(EvalCaseSchema).min(24),
});
export type Dataset = z.infer<typeof DatasetSchema>;
