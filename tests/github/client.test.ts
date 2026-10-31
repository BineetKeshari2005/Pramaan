import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type { Octokit } from "@octokit/rest";
import { describe, expect, it } from "vitest";
import {
  CheckoutError,
  GitHubRateLimitError,
  OctokitGitHubClient,
  TargetNotFoundError,
  createGitHubClientFromEnv,
  defaultGitRunner,
  validateCommit,
} from "../../src/core/github";
import type { TargetRef } from "../../src/core/ports";

import comments3800 from "../fixtures/github/issue-3800-comments.json";
import commits3800 from "../fixtures/github/issue-3800-commits.json";
import issue3800 from "../fixtures/github/issue-3800.json";
import comments4934 from "../fixtures/github/pull-4934-comments.json";
import files4934 from "../fixtures/github/pull-4934-files.json";
import issue4934 from "../fixtures/github/pull-4934-issue.json";
import pull4934 from "../fixtures/github/pull-4934-pull.json";
import repoGitignore from "../fixtures/github/repo-gitignore.json";

function makeFakeOctokit(handlers: {
  issuesGet?: (params: { owner: string; repo: string; issue_number: number }) => Promise<any>;
  issuesListComments?: (params: {
    owner: string;
    repo: string;
    issue_number: number;
    per_page?: number;
  }) => Promise<any>;
  reposGet?: (params: { owner: string; repo: string }) => Promise<any>;
  reposListCommits?: (params: {
    owner: string;
    repo: string;
    sha: string;
    until?: string;
    per_page?: number;
  }) => Promise<any>;
  pullsGet?: (params: { owner: string; repo: string; pull_number: number }) => Promise<any>;
  pullsListFiles?: (params: {
    owner: string;
    repo: string;
    pull_number: number;
    per_page?: number;
    page?: number;
  }) => Promise<any>;
}): Octokit {
  const rest = {
    issues: {
      get: handlers.issuesGet ?? (async () => ({ data: {} })),
      listComments: handlers.issuesListComments ?? (async () => ({ data: [] })),
    },
    repos: {
      get: handlers.reposGet ?? (async () => ({ data: {} })),
      listCommits: handlers.reposListCommits ?? (async () => ({ data: [] })),
    },
    pulls: {
      get: handlers.pullsGet ?? (async () => ({ data: {} })),
      listFiles: handlers.pullsListFiles ?? (async () => ({ data: [] })),
    },
  };
  return { rest } as unknown as Octokit;
}

describe("OctokitGitHubClient fetchTarget", () => {
  it("fetches and maps an issue correctly using recorded fixtures", async () => {
    const fakeOctokit = makeFakeOctokit({
      issuesGet: async (params) => {
        expect(params).toEqual({ owner: "github", repo: "gitignore", issue_number: 3800 });
        return { data: issue3800 };
      },
      issuesListComments: async (params) => {
        expect(params).toEqual({
          owner: "github",
          repo: "gitignore",
          issue_number: 3800,
          per_page: 30,
        });
        return { data: comments3800 };
      },
      reposGet: async (params) => {
        expect(params).toEqual({ owner: "github", repo: "gitignore" });
        return { data: repoGitignore };
      },
      reposListCommits: async (params) => {
        expect(params).toEqual({
          owner: "github",
          repo: "gitignore",
          sha: "main",
          until: "2021-08-04T11:18:29Z",
          per_page: 1,
        });
        return { data: commits3800 };
      },
    });

    const client = new OctokitGitHubClient({ octokit: fakeOctokit });
    const ref: TargetRef = { owner: "github", repo: "gitignore", number: 3800, kind: "issue" };
    const doc = await client.fetchTarget(ref);

    expect(doc.ref).toEqual(ref);
    expect(doc.url).toBe("https://github.com/github/gitignore/issues/3800");
    expect(doc.title).toBe("Unity.gitignore: Do not ignore .sln and .csproj");
    expect(doc.author).toBe("marcospgp");
    expect(doc.state).toBe("closed");
    expect(doc.labels).toEqual(["discussion wanted"]);
    expect(doc.createdAt).toBe("2021-08-04T11:18:29Z");
    expect(doc.body).toBe(issue3800.body);
    expect(doc.comments).toHaveLength(3);
    expect(doc.comments[0]).toEqual({
      author: "RamType0",
      body: comments3800[0]?.body,
      createdAt: "2021-08-27T06:36:09Z",
    });
    expect(doc.commitHint).toBe("a81591327a72605498fe7a29c5c56ab1a40da94a");
    expect(doc.pull).toBeUndefined();
  });

  it("leaves commitHint undefined when no commits are found on default branch", async () => {
    const fakeOctokit = makeFakeOctokit({
      issuesGet: async () => ({ data: issue3800 }),
      issuesListComments: async () => ({ data: [] }),
      reposGet: async () => ({ data: { default_branch: "main" } }),
      reposListCommits: async () => ({ data: [] }),
    });

    const client = new OctokitGitHubClient({ octokit: fakeOctokit });
    const ref: TargetRef = { owner: "github", repo: "gitignore", number: 3800, kind: "issue" };
    const doc = await client.fetchTarget(ref);

    expect(doc.commitHint).toBeUndefined();
  });

  it("handles null body and deleted users (ghost) in issue and comments", async () => {
    const fakeOctokit = makeFakeOctokit({
      issuesGet: async () => ({
        data: {
          number: 101,
          title: "Deleted user report",
          body: null,
          user: null,
          state: "open",
          labels: [],
          created_at: "2026-01-01T00:00:00Z",
        },
      }),
      issuesListComments: async () => ({
        data: [
          {
            user: null,
            body: null,
            created_at: "2026-01-01T01:00:00Z",
          },
          {
            user: { login: "" },
            body: "comment with blank login",
            created_at: "2026-01-01T02:00:00Z",
          },
        ],
      }),
      reposGet: async () => ({ data: { default_branch: "main" } }),
      reposListCommits: async () => ({ data: [] }),
    });

    const client = new OctokitGitHubClient({ octokit: fakeOctokit });
    const ref: TargetRef = { owner: "acme", repo: "widgets", number: 101, kind: "issue" };
    const doc = await client.fetchTarget(ref);

    expect(doc.author).toBe("ghost");
    expect(doc.body).toBe("");
    expect(doc.state).toBe("open");
    expect(doc.comments[0]?.author).toBe("ghost");
    expect(doc.comments[0]?.body).toBe("");
    expect(doc.comments[1]?.author).toBe("ghost");
    expect(doc.comments[1]?.body).toBe("comment with blank login");
  });

  it("fetches and maps a pull request correctly using recorded fixtures", async () => {
    const fakeOctokit = makeFakeOctokit({
      issuesGet: async (params) => {
        expect(params).toEqual({ owner: "github", repo: "gitignore", issue_number: 4934 });
        return { data: issue4934 };
      },
      issuesListComments: async (params) => {
        expect(params).toEqual({
          owner: "github",
          repo: "gitignore",
          issue_number: 4934,
          per_page: 30,
        });
        return { data: comments4934 };
      },
      pullsGet: async (params) => {
        expect(params).toEqual({ owner: "github", repo: "gitignore", pull_number: 4934 });
        return { data: pull4934 };
      },
      pullsListFiles: async (params) => {
        expect(params).toEqual({
          owner: "github",
          repo: "gitignore",
          pull_number: 4934,
          per_page: 100,
          page: 1,
        });
        return { data: files4934 };
      },
    });

    const client = new OctokitGitHubClient({ octokit: fakeOctokit });
    const ref: TargetRef = { owner: "github", repo: "gitignore", number: 4934, kind: "pull" };
    const doc = await client.fetchTarget(ref);

    expect(doc.ref).toEqual(ref);
    expect(doc.url).toBe("https://github.com/github/gitignore/pull/4934");
    expect(doc.title).toBe("feat: prevent leaking kubeconfig");
    expect(doc.state).toBe("closed");
    expect(doc.comments).toHaveLength(2);
    expect(doc.commitHint).toBe("b571b29cdabda3455b33c8c491f4053731fbb08e");
    expect(doc.pull).toEqual({
      baseSha: "0e5d690153ca3da8a4a1aef2d053406f408f531c",
      headSha: "b571b29cdabda3455b33c8c491f4053731fbb08e",
      changedFiles: ["Global/JetBrains.gitignore"],
    });
  });
});

describe("OctokitGitHubClient error handling", () => {
  it("maps 404 to TargetNotFoundError", async () => {
    const fakeOctokit = makeFakeOctokit({
      issuesGet: async () => {
        const error = Object.assign(new Error("Not Found"), { status: 404 });
        throw error;
      },
    });

    const client = new OctokitGitHubClient({ octokit: fakeOctokit });
    const ref: TargetRef = { owner: "acme", repo: "nonexistent", number: 999, kind: "issue" };

    await expect(client.fetchTarget(ref)).rejects.toThrow(TargetNotFoundError);
  });

  it("maps 403 with x-ratelimit-remaining: '0' to GitHubRateLimitError", async () => {
    const fakeOctokit = makeFakeOctokit({
      issuesGet: async () => {
        const error = Object.assign(new Error("API rate limit exceeded"), {
          status: 403,
          response: { headers: { "x-ratelimit-remaining": "0" } },
        });
        throw error;
      },
    });

    const client = new OctokitGitHubClient({ octokit: fakeOctokit });
    const ref: TargetRef = { owner: "acme", repo: "widgets", number: 42, kind: "issue" };

    await expect(client.fetchTarget(ref)).rejects.toThrow(GitHubRateLimitError);
    await expect(client.fetchTarget(ref)).rejects.toThrow(/GITHUB_TOKEN in \.env\.local/);
  });

  it("maps 429 with x-ratelimit-remaining: '0' to GitHubRateLimitError", async () => {
    const fakeOctokit = makeFakeOctokit({
      issuesGet: async () => {
        const error = Object.assign(new Error("Too many requests"), {
          status: 429,
          headers: { "x-ratelimit-remaining": "0" },
        });
        throw error;
      },
    });

    const client = new OctokitGitHubClient({ octokit: fakeOctokit });
    const ref: TargetRef = { owner: "acme", repo: "widgets", number: 42, kind: "issue" };

    await expect(client.fetchTarget(ref)).rejects.toThrow(GitHubRateLimitError);
    await expect(client.fetchTarget(ref)).rejects.toThrow(/GITHUB_TOKEN in \.env\.local/);
  });
});

describe("OctokitGitHubClient checkout with fake GitRunner", () => {
  it("executes the exact sequence of git commands with security flags for fresh repo", async () => {
    const calls: Array<{ args: string[]; opts?: { cwd?: string } }> = [];
    const fakeGit = async (args: string[], opts?: { cwd?: string }) => {
      calls.push({ args, opts });
      if (args[args.length - 1] === "HEAD" && args[args.length - 2] === "rev-parse") {
        return { stdout: "deadbeef1234\n" };
      }
      return { stdout: "" };
    };

    const tmpCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "pramaan-checkout-test-"));
    try {
      const client = new OctokitGitHubClient({
        octokit: makeFakeOctokit({}),
        git: fakeGit,
        cacheDir: tmpCacheDir,
      });

      const res = await client.checkout({ owner: "acme", repo: "widgets" }, "feature-branch");
      const expectedDir = path.resolve(tmpCacheDir, "acme__widgets@feature-branch");

      expect(res).toEqual({
        dir: expectedDir,
        commit: "deadbeef1234",
      });

      expect(calls).toHaveLength(5);
      const expectedFlags = [
        "-c",
        "core.hooksPath=/dev/null",
        "-c",
        "core.symlinks=false",
        "-c",
        "protocol.file.allow=never",
      ];

      expect(calls[0]).toEqual({
        args: [...expectedFlags, "init"],
        opts: { cwd: expectedDir },
      });
      expect(calls[1]).toEqual({
        args: [
          ...expectedFlags,
          "remote",
          "add",
          "origin",
          "https://github.com/acme/widgets.git",
        ],
        opts: { cwd: expectedDir },
      });
      expect(calls[2]).toEqual({
        args: [...expectedFlags, "fetch", "--depth", "1", "origin", "feature-branch"],
        opts: { cwd: expectedDir },
      });
      expect(calls[3]).toEqual({
        args: [...expectedFlags, "checkout", "--force", "--detach", "FETCH_HEAD"],
        opts: { cwd: expectedDir },
      });
      expect(calls[4]).toEqual({
        args: [...expectedFlags, "rev-parse", "HEAD"],
        opts: { cwd: expectedDir },
      });
    } finally {
      fs.rmSync(tmpCacheDir, { recursive: true, force: true });
    }
  });

  it("skips init and remote add when repository directory already exists", async () => {
    const calls: Array<{ args: string[]; opts?: { cwd?: string } }> = [];
    const fakeGit = async (args: string[], opts?: { cwd?: string }) => {
      calls.push({ args, opts });
      if (args[args.length - 1] === "HEAD" && args[args.length - 2] === "rev-parse") {
        return { stdout: "abc0001\n" };
      }
      return { stdout: "" };
    };

    const tmpCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "pramaan-checkout-existing-"));
    const repoDir = path.join(tmpCacheDir, "acme__widgets@HEAD");
    fs.mkdirSync(repoDir, { recursive: true });

    try {
      const client = new OctokitGitHubClient({
        octokit: makeFakeOctokit({}),
        git: fakeGit,
        cacheDir: tmpCacheDir,
      });

      const res = await client.checkout({ owner: "acme", repo: "widgets" });
      expect(res.commit).toBe("abc0001");

      // init and remote add are skipped
      expect(calls).toHaveLength(3);
      expect(calls[0]?.args.slice(-5)).toEqual(["fetch", "--depth", "1", "origin", "HEAD"]);
      expect(calls[1]?.args.slice(-4)).toEqual(["checkout", "--force", "--detach", "FETCH_HEAD"]);
      expect(calls[2]?.args.slice(-2)).toEqual(["rev-parse", "HEAD"]);
    } finally {
      fs.rmSync(tmpCacheDir, { recursive: true, force: true });
    }
  });

  it("rejects malicious commits before git runs", async () => {
    const calls: string[][] = [];
    const fakeGit = async (args: string[]) => {
      calls.push(args);
      return { stdout: "" };
    };

    const client = new OctokitGitHubClient({
      octokit: makeFakeOctokit({}),
      git: fakeGit,
    });

    const malicious = [
      "--upload-pack=x",
      "a;rm -rf",
      "-v",
      "--exec=touch /tmp/pwn",
      "branch with spaces",
      "",
      "a".repeat(101),
    ];

    for (const commit of malicious) {
      await expect(
        client.checkout({ owner: "acme", repo: "widgets" }, commit),
      ).rejects.toThrow(CheckoutError);
    }

    expect(calls).toHaveLength(0);
  });

  it("wraps git failures in CheckoutError and includes stderr", async () => {
    const fakeGit = async () => {
      const err = Object.assign(new Error("Command failed"), {
        stderr: "fatal: unable to access 'https://github.com/acme/widgets.git': Could not resolve host",
      });
      throw err;
    };

    const tmpCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "pramaan-checkout-fail-"));
    try {
      const client = new OctokitGitHubClient({
        octokit: makeFakeOctokit({}),
        git: fakeGit,
        cacheDir: tmpCacheDir,
      });

      const promise = client.checkout({ owner: "acme", repo: "widgets" });
      await expect(promise).rejects.toThrow(CheckoutError);

      try {
        await promise;
      } catch (e) {
        const err = e as CheckoutError;
        expect(err.stderr).toContain("Could not resolve host");
      }
    } finally {
      fs.rmSync(tmpCacheDir, { recursive: true, force: true });
    }
  });
});

describe("OctokitGitHubClient commit resolution and per-commit checkouts", () => {
  const FULL = "a81591327a72605498fe7a29c5c56ab1a40da94a";
  const OTHER = "b571b29cdabda3455b33c8c491f4053731fbb08e";

  function recordingGit(headFor: (cwd: string) => string) {
    const calls: Array<{ args: string[]; cwd?: string }> = [];
    const git = async (args: string[], opts?: { cwd?: string }) => {
      calls.push({ args, cwd: opts?.cwd });
      if (args.at(-1) === "init" && opts?.cwd) fs.mkdirSync(path.join(opts.cwd, ".git"), { recursive: true });
      if (args.at(-2) === "rev-parse") return { stdout: `${headFor(opts?.cwd ?? "")}\n` };
      await new Promise((r) => setTimeout(r, 5));
      return { stdout: "" };
    };
    return { git, calls };
  }

  const octokitResolving = (shas: Record<string, string>, defaultBranch = "main") =>
    ({
      rest: {
        repos: {
          get: async () => ({ data: { default_branch: defaultBranch } }),
          getCommit: async ({ ref }: { ref: string }) => {
            const sha = shas[ref];
            if (!sha) throw Object.assign(new Error("No commit found"), { status: 422 });
            return { data: { sha } };
          },
        },
      },
    }) as unknown as Octokit;

  it("resolves a short SHA to the full SHA before fetching, since GitHub cannot fetch short SHAs", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pramaan-resolve-"));
    try {
      const { git, calls } = recordingGit(() => FULL);
      const client = new OctokitGitHubClient({ octokit: octokitResolving({ a815913: FULL }), git, cacheDir: tmp });
      const res = await client.checkout({ owner: "github", repo: "gitignore" }, "a815913");
      expect(res).toEqual({ dir: path.resolve(tmp, `github__gitignore@${FULL}`), commit: FULL });
      expect(calls.find((c) => c.args.includes("fetch"))?.args.at(-1)).toBe(FULL);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("resolves the default branch when no commit is given", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pramaan-default-"));
    try {
      const { git } = recordingGit(() => FULL);
      const client = new OctokitGitHubClient({ octokit: octokitResolving({ main: FULL }), git, cacheDir: tmp });
      expect((await client.checkout({ owner: "o", repo: "r" })).commit).toBe(FULL);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("reports an unknown commit clearly without running git", async () => {
    const { git, calls } = recordingGit(() => FULL);
    const client = new OctokitGitHubClient({ octokit: octokitResolving({}), git });
    await expect(client.checkout({ owner: "o", repo: "r" }, "deadbee")).rejects.toThrow(/does not exist in o\/r/);
    expect(calls).toHaveLength(0);
  });

  it("checks out different commits into different directories, concurrently", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pramaan-concurrent-"));
    try {
      const { git } = recordingGit((cwd) => (cwd.endsWith(FULL) ? FULL : OTHER));
      const client = new OctokitGitHubClient({ octokit: octokitResolving({}), git, cacheDir: tmp });
      const [a, b] = await Promise.all([
        client.checkout({ owner: "o", repo: "r" }, FULL),
        client.checkout({ owner: "o", repo: "r" }, OTHER),
      ]);
      expect(a).toEqual({ dir: path.resolve(tmp, `o__r@${FULL}`), commit: FULL });
      expect(b).toEqual({ dir: path.resolve(tmp, `o__r@${OTHER}`), commit: OTHER });
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("serializes concurrent checkouts of the same commit and reuses the finished checkout", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pramaan-same-"));
    try {
      const { git, calls } = recordingGit(() => FULL);
      const client = new OctokitGitHubClient({ octokit: octokitResolving({}), git, cacheDir: tmp });
      await Promise.all([client.checkout({ owner: "o", repo: "r" }, FULL), client.checkout({ owner: "o", repo: "r" }, FULL)]);
      expect(calls.filter((c) => c.args.includes("init"))).toHaveLength(1);
      expect(calls.filter((c) => c.args.includes("fetch"))).toHaveLength(1);

      await client.checkout({ owner: "o", repo: "r" }, FULL);
      expect(calls.filter((c) => c.args.includes("fetch"))).toHaveLength(1);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("commit validator helper", () => {
  it("validates safe commits and rejects dangerous ones", () => {
    expect(() => validateCommit("HEAD")).not.toThrow();
    expect(() => validateCommit("main")).not.toThrow();
    expect(() => validateCommit("v1.2.3")).not.toThrow();
    expect(() => validateCommit("feat/checkout-adapter_v2")).not.toThrow();
    expect(() => validateCommit("a81591327a72605498fe7a29c5c56ab1a40da94a")).not.toThrow();

    expect(() => validateCommit("--upload-pack=x")).toThrow(CheckoutError);
    expect(() => validateCommit("a;rm -rf")).toThrow(CheckoutError);
    expect(() => validateCommit("-b")).toThrow(CheckoutError);
  });
});

describe("createGitHubClientFromEnv", () => {
  it("creates an OctokitGitHubClient reading GITHUB_TOKEN optionally", () => {
    const clientWithToken = createGitHubClientFromEnv({ GITHUB_TOKEN: "test-token-123" });
    expect(clientWithToken).toBeInstanceOf(OctokitGitHubClient);

    const clientWithoutToken = createGitHubClientFromEnv({});
    expect(clientWithoutToken).toBeInstanceOf(OctokitGitHubClient);
  });
});

describe("real GitRunner integration test against local bare repository", () => {
  it("successfully clones, fetches and checks out a local bare git repo", async () => {
    const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), "pramaan-real-git-"));
    const bareRepoDir = path.join(tmpBase, "test", "project.git");
    const initWorkDir = path.join(tmpBase, "init-work");
    const cacheDir = path.join(tmpBase, "cache");

    try {
      // 1. Setup a bare upstream repo matching <remoteBase>/<owner>/<repo>.git
      fs.mkdirSync(bareRepoDir, { recursive: true });
      execFileSync("git", ["init", "--bare"], { cwd: bareRepoDir });

      // 2. Commit a file to upstream
      fs.mkdirSync(initWorkDir, { recursive: true });
      execFileSync("git", ["init", "-b", "main"], { cwd: initWorkDir });
      execFileSync("git", ["config", "user.name", "Test Runner"], { cwd: initWorkDir });
      execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: initWorkDir });
      fs.writeFileSync(path.join(initWorkDir, "README.md"), "# Local Test Repo\n");
      execFileSync("git", ["add", "README.md"], { cwd: initWorkDir });
      execFileSync("git", ["commit", "-m", "initial commit"], { cwd: initWorkDir });
      execFileSync("git", ["remote", "add", "origin", bareRepoDir], { cwd: initWorkDir });
      execFileSync("git", ["push", "origin", "main"], { cwd: initWorkDir });
      const commitSha = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: initWorkDir,
        encoding: "utf8",
      }).trim();

      // 3. Test checkout with real defaultGitRunner
      // remoteBase points to directory containing `test/project.git`
      const client = new OctokitGitHubClient({
        octokit: makeFakeOctokit({}),
        git: defaultGitRunner,
        cacheDir,
        remoteBase: tmpBase,
        allowFileProtocol: true,
      });

      const checkoutResult = await client.checkout(
        { owner: "test", repo: "project" },
        "main",
      );

      expect(checkoutResult.commit).toBe(commitSha);
      expect(path.isAbsolute(checkoutResult.dir)).toBe(true);
      const checkedOutReadme = fs.readFileSync(
        path.join(checkoutResult.dir, "README.md"),
        "utf8",
      );
      expect(checkedOutReadme).toBe("# Local Test Repo\n");
    } finally {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    }
  });
});
