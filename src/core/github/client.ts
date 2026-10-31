import fs from "node:fs";
import path from "node:path";
import type { Octokit } from "@octokit/rest";
import type { Checkout, GitHubClient, RepoRef, TargetComment, TargetDocument, TargetRef } from "../ports";
import { targetUrl } from "../target";
import { CheckoutError, handleOctokitError } from "./errors";
import { type GitRunner, defaultGitRunner, getGitSecurityFlags, validateCommit } from "./git";

export interface OctokitGitHubClientOptions {
  octokit: Octokit;
  git?: GitRunner;
  cacheDir?: string;
  remoteBase?: string;
  allowFileProtocol?: boolean;
}

export class OctokitGitHubClient implements GitHubClient {
  private readonly octokit: Octokit;
  private readonly git: GitRunner;
  private readonly cacheDir: string;
  private readonly remoteBase: string;
  private readonly allowFileProtocol: boolean;
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(options: OctokitGitHubClientOptions) {
    this.octokit = options.octokit;
    this.git = options.git ?? defaultGitRunner;
    this.cacheDir = options.cacheDir ?? ".pramaan/repos";
    this.remoteBase = (options.remoteBase ?? "https://github.com").replace(/\/+$/, "");
    this.allowFileProtocol = options.allowFileProtocol ?? false;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Support both Octokit.rest and Octokit direct aliases in fakes
  private get rest(): any {
    const o = this.octokit as any;
    return o.rest ?? o;
  }

  async fetchTarget(ref: TargetRef): Promise<TargetDocument> {
    try {
      const rest = this.rest;

      // 1. Fetch issue (works for pull requests too)
      const { data: issue } = await rest.issues.get({
        owner: ref.owner,
        repo: ref.repo,
        issue_number: ref.number,
      });

      // 2. Fetch first 30 comments
      const { data: commentsData } = await rest.issues.listComments({
        owner: ref.owner,
        repo: ref.repo,
        issue_number: ref.number,
        per_page: 30,
      });

      // biome-ignore lint/suspicious/noExplicitAny: Raw comment structure
      const comments: TargetComment[] = (commentsData ?? []).slice(0, 30).map((c: any) => ({
        author: c.user?.login ? String(c.user.login) : "ghost",
        body: c.body ?? "",
        createdAt: String(c.created_at ?? ""),
      }));

      const author = issue.user?.login ? String(issue.user.login) : "ghost";
      const body = issue.body ?? "";
      const state: "open" | "closed" = issue.state === "closed" ? "closed" : "open";
      // biome-ignore lint/suspicious/noExplicitAny: Label may be object or string
      const labels = (issue.labels ?? []).map((l: any) =>
        typeof l === "string" ? l : (l.name ?? ""),
      ).filter(Boolean);
      const createdAt = String(issue.created_at ?? "");
      const url = targetUrl(ref);

      if (ref.kind === "pull") {
        const { data: pull } = await rest.pulls.get({
          owner: ref.owner,
          repo: ref.repo,
          pull_number: ref.number,
        });

        const changedFiles: string[] = [];
        for (let page = 1; page <= 3; page++) {
          const { data: files } = await rest.pulls.listFiles({
            owner: ref.owner,
            repo: ref.repo,
            pull_number: ref.number,
            per_page: 100,
            page,
          });

          if (!files || files.length === 0) break;
          // biome-ignore lint/suspicious/noExplicitAny: File structure
          for (const file of files as any[]) {
            if (file.filename) {
              changedFiles.push(String(file.filename));
            }
            if (changedFiles.length >= 300) break;
          }
          if (files.length < 100 || changedFiles.length >= 300) break;
        }

        const baseSha = String(pull.base?.sha ?? "");
        const headSha = String(pull.head?.sha ?? "");

        return {
          ref,
          url,
          title: String(issue.title ?? ""),
          body,
          author,
          state,
          labels,
          createdAt,
          comments,
          commitHint: headSha || undefined,
          pull: {
            baseSha,
            headSha,
            changedFiles,
          },
        };
      }

      // kind === "issue"
      let commitHint: string | undefined;
      const { data: repoData } = await rest.repos.get({
        owner: ref.owner,
        repo: ref.repo,
      });

      const defaultBranch = repoData?.default_branch;
      if (defaultBranch) {
        const { data: commits } = await rest.repos.listCommits({
          owner: ref.owner,
          repo: ref.repo,
          sha: defaultBranch,
          until: issue.created_at,
          per_page: 1,
        });

        if (commits && commits.length > 0 && commits[0]?.sha) {
          commitHint = String(commits[0].sha);
        }
      }

      const doc: TargetDocument = {
        ref,
        url,
        title: String(issue.title ?? ""),
        body,
        author,
        state,
        labels,
        createdAt,
        comments,
        ...(commitHint ? { commitHint } : {}),
      };

      return doc;
    } catch (err) {
      handleOctokitError(err, ref);
    }
  }

  async checkout(repo: RepoRef, commit?: string): Promise<Checkout> {
    if (commit !== undefined) {
      validateCommit(commit);
    }

    const sha = await this.resolveCommit(repo, commit);
    const ref = sha ?? commit ?? "HEAD";
    // One directory per commit, so concurrent jobs on different commits never share a work tree.
    const repoDir = path.resolve(this.cacheDir, `${repo.owner}__${repo.repo}@${ref.replace(/\//g, "_")}`);
    return this.withLock(repoDir, () => this.checkoutInto(repo, ref, sha, repoDir));
  }

  /**
   * Resolves short SHAs, branches and tags (or the default branch) to a full SHA via the API,
   * because git can only fetch a commit from GitHub by its full SHA. Returns undefined when the
   * API cannot answer (for example a non-GitHub remote), and the ref is then fetched by name.
   */
  private async resolveCommit(repo: RepoRef, commit?: string): Promise<string | undefined> {
    if (commit && /^[0-9a-f]{40}$/i.test(commit)) return commit.toLowerCase();
    const rest = this.rest;
    if (typeof rest.repos?.getCommit !== "function") return undefined;

    let ref = commit;
    try {
      if (!ref) {
        const { data } = await rest.repos.get({ owner: repo.owner, repo: repo.repo });
        ref = data?.default_branch;
        if (!ref) return undefined;
      }
      const { data } = await rest.repos.getCommit({ owner: repo.owner, repo: repo.repo, ref, per_page: 1 });
      return typeof data?.sha === "string" ? data.sha : undefined;
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 404 || status === 422) {
        throw new CheckoutError(`Commit or ref "${commit}" does not exist in ${repo.owner}/${repo.repo}`);
      }
      handleOctokitError(err);
    }
  }

  private async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(fn);
    const settled = run.catch(() => undefined);
    this.locks.set(key, settled);
    try {
      return await run;
    } finally {
      if (this.locks.get(key) === settled) this.locks.delete(key);
    }
  }

  private async checkoutInto(repo: RepoRef, ref: string, sha: string | undefined, repoDir: string): Promise<Checkout> {
    const securityFlags = getGitSecurityFlags(this.allowFileProtocol);

    if (sha && fs.existsSync(path.join(repoDir, ".git"))) {
      const head = await this.runGit([...securityFlags, "rev-parse", "HEAD"], repoDir).catch(() => undefined);
      if (head?.stdout.trim() === sha) return { dir: repoDir, commit: sha };
    }

    if (!fs.existsSync(repoDir)) {
      fs.mkdirSync(repoDir, { recursive: true });
      await this.runGit([...securityFlags, "init"], repoDir);
      await this.runGit(
        [
          ...securityFlags,
          "remote",
          "add",
          "origin",
          `${this.remoteBase}/${repo.owner}/${repo.repo}.git`,
        ],
        repoDir,
      );
    }

    await this.runGit(
      [...securityFlags, "fetch", "--depth", "1", "origin", ref],
      repoDir,
    );
    await this.runGit(
      [...securityFlags, "checkout", "--force", "--detach", "FETCH_HEAD"],
      repoDir,
    );
    const { stdout } = await this.runGit(
      [...securityFlags, "rev-parse", "HEAD"],
      repoDir,
    );

    return {
      dir: repoDir,
      commit: stdout.trim(),
    };
  }

  private async runGit(args: string[], cwd: string): Promise<{ stdout: string }> {
    try {
      return await this.git(args, { cwd });
    } catch (err: unknown) {
      if (err instanceof CheckoutError) {
        throw err;
      }
      const stderr =
        typeof err === "object" && err !== null && "stderr" in err
          ? String((err as { stderr: unknown }).stderr)
          : "";
      throw new CheckoutError((err as Error).message || "Git command failed", stderr);
    }
  }
}
