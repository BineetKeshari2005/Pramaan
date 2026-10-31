import { Octokit } from "@octokit/rest";
import { OctokitGitHubClient, type OctokitGitHubClientOptions } from "./client";
import { defaultGitRunner } from "./git";

export * from "./errors";
export * from "./git";
export * from "./client";

export function createGitHubClientFromEnv(
  env: Record<string, string | undefined> = process.env,
  options: Partial<Omit<OctokitGitHubClientOptions, "octokit">> = {},
): OctokitGitHubClient {
  const token = env.GITHUB_TOKEN?.trim();
  const quiet = () => {};
  // Failed requests already surface as typed errors; Octokit's own request logging is noise.
  const log = { debug: quiet, info: quiet, warn: console.warn, error: quiet };
  const octokit = new Octokit(token ? { auth: token, log } : { log });
  return new OctokitGitHubClient({
    octokit,
    git: options.git ?? defaultGitRunner,
    cacheDir: options.cacheDir,
    remoteBase: options.remoteBase,
    allowFileProtocol: options.allowFileProtocol,
  });
}
