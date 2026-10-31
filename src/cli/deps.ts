import type { PipelineDeps } from "../core";
import { createExtractorFromEnv } from "../core/claims";
import { createGitHubClientFromEnv } from "../core/github";
import { createStaticVerifiers } from "../core/static";

/**
 * Builds the real adapters from the environment: GitHub (GITHUB_TOKEN, optional), the Ollama
 * claim extractor (PRAMAAN_EXTRACT_MODEL, OLLAMA_URL, PRAMAAN_EXTRACT_THINK) and the static verifiers.
 */
export function createDeps(env: Record<string, string | undefined> = process.env): PipelineDeps {
  return {
    github: createGitHubClientFromEnv(env),
    extractor: createExtractorFromEnv(env),
    verifiers: createStaticVerifiers(),
  };
}
