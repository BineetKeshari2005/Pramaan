import { OllamaClient } from "../llm";
import { LlmClaimExtractor } from "./extractor";

export * from "./extractor";
export * from "./prompt";

export const DEFAULT_EXTRACT_MODEL = "gemma4:e2b-it-qat";

export function createExtractorFromEnv(env: Record<string, string | undefined> = process.env): LlmClaimExtractor {
  const llm = new OllamaClient({
    model: env.PRAMAAN_EXTRACT_MODEL?.trim() || DEFAULT_EXTRACT_MODEL,
    baseUrl: env.OLLAMA_URL?.trim() || undefined,
  });
  return new LlmClaimExtractor({ llm });
}
