// Runs the real Ollama claim extractor on a TargetDocument JSON file and records every raw
// model response, so tests can replay genuine model output without Ollama.
// Usage: npx tsx scripts/record-extraction.ts tests/fixtures/issues/<name>.json
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { DEFAULT_EXTRACT_MODEL, groundClaims, LlmClaimExtractor, parseExtractionOutput, reportSections } from "../src/core/claims";
import { OllamaClient } from "../src/core/llm";
import type { LlmClient, LlmRequest, TargetDocument } from "../src/core/ports";

const inputFile = process.argv[2];
if (!inputFile) {
  console.error("Usage: npx tsx scripts/record-extraction.ts tests/fixtures/issues/<name>.json");
  process.exit(1);
}

const doc = JSON.parse(readFileSync(inputFile, "utf8")) as TargetDocument & { sourceUrl?: string };
const ollama = new OllamaClient({
  model: process.env.PRAMAAN_EXTRACT_MODEL?.trim() || DEFAULT_EXTRACT_MODEL,
  baseUrl: process.env.OLLAMA_URL?.trim() || undefined,
  timeoutMs: 600_000,
});

const responses: string[] = [];
const recorder: LlmClient = {
  model: ollama.model,
  async completeJson(request: LlmRequest) {
    const raw = await ollama.completeJson(request);
    responses.push(raw);
    return raw;
  },
};

const started = Date.now();
const result = await new LlmClaimExtractor({ llm: recorder }).extract(doc);
const last = responses.at(-1);
const parsed = last === undefined ? undefined : parseExtractionOutput(last);
const dropped = parsed?.ok ? groundClaims(parsed.claims, reportSections(doc)).dropped : 0;

const out = `tests/fixtures/ollama/${basename(inputFile)}`;
writeFileSync(
  out,
  `${JSON.stringify(
    {
      model: ollama.model,
      recordedAt: new Date().toISOString(),
      inputFile,
      sourceUrl: doc.sourceUrl,
      durationMs: Date.now() - started,
      responses,
      summary: {
        status: result.status,
        attempts: result.attempts,
        claims: result.status === "ok" ? result.claims.length : 0,
        droppedByGrounding: dropped,
      },
    },
    null,
    2,
  )}\n`,
);
console.error(`${result.status}: ${result.status === "ok" ? result.claims.length : 0} claims, ${dropped} dropped, ${result.attempts} attempt(s) -> ${out}`);
