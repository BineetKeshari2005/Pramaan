import type { PipelineDeps } from "../core";
import { createExtractorFromEnv } from "../core/claims";
import { createGitHubClientFromEnv } from "../core/github";
import { DockerSandbox, PythonReproVerifier } from "../core/sandbox";
import { createStaticVerifiers } from "../core/static";

/**
 * Builds the real adapters from the environment: GitHub (GITHUB_TOKEN, optional), the Ollama
 * claim extractor (PRAMAAN_EXTRACT_MODEL, OLLAMA_URL, PRAMAAN_EXTRACT_THINK), the static
 * verifiers, and the Docker sandbox for executing reporters' snippets (PRAMAAN_SANDBOX=off
 * disables it). When Docker is not running, the sandbox check reports that instead of failing.
 */
export function createDeps(env: Record<string, string | undefined> = process.env): PipelineDeps {
  const sandboxOn = env.PRAMAAN_SANDBOX?.trim().toLowerCase() !== "off";
  return {
    github: createGitHubClientFromEnv(env),
    extractor: createExtractorFromEnv(env),
    verifiers: [...createStaticVerifiers(), ...(sandboxOn ? [new PythonReproVerifier()] : [])],
    sandbox: sandboxOn ? new DockerSandbox() : undefined,
  };
}
