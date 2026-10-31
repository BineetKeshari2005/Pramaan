import type { PipelineDeps } from "../core";

/** Builds the real adapters (GitHub, Ollama, Docker) from the environment. */
export function createDeps(): PipelineDeps {
  throw new Error("No GitHub or claim-extraction adapter is configured in src/cli/deps.ts.");
}
