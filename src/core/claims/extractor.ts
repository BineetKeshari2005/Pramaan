import { z } from "zod";
import type { ClaimExtractor, LlmClient, TargetDocument } from "../ports";
import { type Claim, ClaimSchema, type ExtractionResult } from "../types";
import { buildExtractionPrompt, reportSections, SYSTEM_PROMPT } from "./prompt";

export const ExtractedClaimSchema = ClaimSchema.omit({ id: true });
export type ExtractedClaim = z.infer<typeof ExtractedClaimSchema>;
export const ExtractionOutputSchema = z.object({ claims: z.array(ExtractedClaimSchema) });

export const EXTRACTION_JSON_SCHEMA = z.toJSONSchema(ExtractionOutputSchema) as Record<string, unknown>;

export interface LlmClaimExtractorOptions {
  llm: LlmClient;
  maxAttempts?: number;
  maxClaims?: number;
}

type ParseOutcome = { ok: true; claims: ExtractedClaim[] } | { ok: false; error: string };

export function parseExtractionOutput(raw: string): ParseOutcome {
  const text = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (err) {
    return { ok: false, error: `not valid JSON (${(err as Error).message})` };
  }
  const parsed = ExtractionOutputSchema.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    return { ok: false, error: `does not match the schema (${issues})` };
  }
  return { ok: true, claims: parsed.data.claims };
}

// The prompt asks for single quotes inside JSON strings, so quote styles must compare equal.
const normalizeText = (s: string) =>
  s.toLowerCase().replace(/[`*]/g, "").replace(/["“”‘’]/g, "'").replace(/\s+/g, " ").trim();
const cleanToken = (s: string) => s.replace(/`/g, "").trim();
const cleanFile = (s: string) => cleanToken(s).replace(/^\.\//, "");
const cleanSymbol = (s: string) => cleanToken(s).replace(/\(\)$/, "");

const MIN_QUOTE_CHARS = 10;
const MIN_STATEMENT_WORDS = 4;
const count = (s: string, ch: string) => s.split(ch).length - 1;

/** Small models sometimes break a JSON string at an inner quote, leaving fragments like "Calling `f(". */
function isWellFormed(claim: ExtractedClaim): boolean {
  const statement = claim.statement.trim();
  return (
    normalizeText(claim.quote).length >= MIN_QUOTE_CHARS &&
    statement.split(/\s+/).length >= MIN_STATEMENT_WORDS &&
    count(statement, "(") === count(statement, ")") &&
    count(statement, "`") % 2 === 0
  );
}

/**
 * Keeps only what the report actually says: a claim whose quote is not in the report (or that is a
 * truncated fragment) is dropped, and references that never appear in the report are removed.
 */
export function groundClaims(
  claims: ExtractedClaim[],
  sections: string[],
): { kept: ExtractedClaim[]; dropped: number } {
  const haystack = normalizeText(sections.join("\n"));
  const appears = (s: string) => s.length > 0 && haystack.includes(normalizeText(s));
  const appearsVersion = (v: string) => appears(v) || appears(v.replace(/^v(?=\d)/i, ""));

  const kept: ExtractedClaim[] = [];
  for (const claim of claims) {
    if (!isWellFormed(claim) || !appears(claim.quote)) continue;
    const files = [...new Set(claim.references.files.map(cleanFile))].filter(appears);
    const evidence = claim.evidenceProvided.length > 1
      ? claim.evidenceProvided.filter((e) => e !== "none")
      : claim.evidenceProvided;
    kept.push({
      ...claim,
      statement: claim.statement.trim(),
      quote: claim.quote.trim(),
      references: {
        files,
        symbols: [...new Set(claim.references.symbols.map(cleanSymbol))].filter(appears),
        lines: claim.references.lines
          .map((l) => ({ file: cleanFile(l.file), line: l.line }))
          .filter((l) => appears(l.file) && appears(String(l.line))),
        versions: [...new Set(claim.references.versions.map(cleanToken))].filter(appearsVersion),
        commands: [...new Set(claim.references.commands.map(cleanToken))].filter(appears),
      },
      evidenceProvided: [...new Set(evidence)],
    });
  }
  return { kept, dropped: claims.length - kept.length };
}

export class LlmClaimExtractor implements ClaimExtractor {
  private readonly llm: LlmClient;
  private readonly maxAttempts: number;
  private readonly maxClaims: number;

  constructor(options: LlmClaimExtractorOptions) {
    this.llm = options.llm;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.maxClaims = options.maxClaims ?? 12;
  }

  async extract(doc: TargetDocument): Promise<ExtractionResult> {
    const model = this.llm.model;
    const basePrompt = buildExtractionPrompt(doc);
    let prompt = basePrompt;
    let lastError = "";

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const raw = await this.llm.completeJson({
        system: SYSTEM_PROMPT,
        prompt,
        jsonSchema: EXTRACTION_JSON_SCHEMA,
      });
      const outcome = parseExtractionOutput(raw);
      if (!outcome.ok) {
        lastError = outcome.error;
        prompt = `${basePrompt}\n\nYour previous output was invalid: ${outcome.error}. Return only valid JSON that matches the schema.`;
        continue;
      }

      const { kept } = groundClaims(outcome.claims, reportSections(doc));
      if (outcome.claims.length > 0 && kept.length === 0) {
        return {
          status: "abstained",
          reason: "extracted claims were not grounded in the report text",
          model,
          attempts: attempt,
        };
      }
      return { status: "ok", claims: finalize(kept, this.maxClaims), model, attempts: attempt };
    }

    return {
      status: "abstained",
      reason: `model output was invalid after ${this.maxAttempts} attempts: ${lastError}`,
      model,
      attempts: this.maxAttempts,
    };
  }
}

function finalize(claims: ExtractedClaim[], maxClaims: number): Claim[] {
  const seen = new Set<string>();
  const unique = claims.filter((c) => {
    const key = normalizeText(c.statement);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.slice(0, maxClaims).map((c, i) => ({ ...c, id: `c${i + 1}` }));
}
