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
  const octokit = new Octokit(token ? { auth: token } : {});
  return new OctokitGitHubClient({
    octokit,
    git: options.git ?? defaultGitRunner,
    cacheDir: options.cacheDir,
    remoteBase: options.remoteBase,
    allowFileProtocol: options.allowFileProtocol,
  });
}
