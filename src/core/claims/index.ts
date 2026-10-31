import { OllamaClient, type OllamaClientOptions } from "../llm";
import { LlmClaimExtractor } from "./extractor";

export * from "./extractor";
export * from "./prompt";

export const DEFAULT_EXTRACT_MODEL = "gemma4:e2b-it-qat";

/** Reads PRAMAAN_EXTRACT_MODEL, OLLAMA_URL and PRAMAAN_EXTRACT_THINK ("true" or "false", default true). */
export function extractorOllamaOptions(env: Record<string, string | undefined> = process.env): OllamaClientOptions {
  const think = env.PRAMAAN_EXTRACT_THINK?.trim().toLowerCase();
  return {
    model: env.PRAMAAN_EXTRACT_MODEL?.trim() || DEFAULT_EXTRACT_MODEL,
    baseUrl: env.OLLAMA_URL?.trim() || undefined,
    // With thinking, gemma4:e2b finds about three times as many claims, at roughly 6x the latency.
    think: think !== "false",
  };
}

export function createExtractorFromEnv(env: Record<string, string | undefined> = process.env): LlmClaimExtractor {
  return new LlmClaimExtractor({ llm: new OllamaClient(extractorOllamaOptions(env)) });
}
