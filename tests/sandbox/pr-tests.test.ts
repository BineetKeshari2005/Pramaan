import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Sandbox, SandboxResult, SandboxSpec, VerifyContext } from "../../src/core";
import { buildRevertedTree, judgeTestRuns, PrTestHonestyVerifier, splitChangedFiles } from "../../src/core/sandbox";
import { makeClaim, makeTarget } from "../fakes";

const run = (exitCode: number | null, out = ""): SandboxResult => ({ exitCode, stdout: out, stderr: "", timedOut: false, durationMs: 900 });
const AT = "acme/demo 1111111..2222222";

describe("splitChangedFiles", () => {
  it("separates test files from code, and ignores docs and CI config", () => {
    expect(
      splitChangedFiles([
        "src/url.py",
        "tests/test_url.py",
        "pkg/parser_test.py",
        "web/app.test.ts",
        "README.md",
        "docs/usage.rst",
        ".github/workflows/ci.yml",
        "CHANGELOG.md",
      ]),
    ).toEqual({ tests: ["tests/test_url.py", "pkg/parser_test.py", "web/app.test.ts"], fix: ["src/url.py"] });
  });
});

describe("judgeTestRuns", () => {
  it("confirms the fix when the tests fail without it and pass with it", () => {
    const r = judgeTestRuns(run(0, "1 passed"), run(1, "1 failed"), ["tests/test_url.py"], AT);
    expect(r.verdict).toBe("reproduced");
    expect(r.evidence[0]).toMatchObject({ kind: "failing_test", source: "pr-test-honesty" });
    expect(r.evidence[0]?.log).toContain("## with the PR's code changes reverted (tests kept): exit 1");
  });

  it("counts a collection error without the fix (the test imports what the fix adds) as failing", () => {
    expect(judgeTestRuns(run(0), run(2, "ImportError: cannot import name 'parse_url_v2'"), ["t.py"], AT).verdict).toBe("reproduced");
  });

  it("contradicts the PR when its tests pass even without the code change", () => {
    const r = judgeTestRuns(run(0), run(0), ["tests/test_url.py"], AT);
    expect(r.verdict).toBe("contradicted");
    expect(r.evidence[0]?.summary).toContain("do not test the fix");
  });

  it("stays undecided when the tests cannot pass in the sandbox, collect nothing, or time out", () => {
    expect(judgeTestRuns(run(1, "ModuleNotFoundError: No module named 'httpx'"), run(1), ["t.py"], AT).verdict).toBe("insufficient_evidence");
    expect(judgeTestRuns(run(5), run(5), ["t.py"], AT).verdict).toBe("insufficient_evidence");
    expect(judgeTestRuns({ ...run(null), timedOut: true }, run(0), ["t.py"], AT).verdict).toBe("insufficient_evidence");
    expect(judgeTestRuns(run(0), run(4), ["t.py"], AT).verdict).toBe("insufficient_evidence");
  });
});

const dirs: string[] = [];
function tree(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pramaan-pr-"));
  dirs.push(dir);
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
}
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("buildRevertedTree", () => {
  it("keeps the PR's tests, restores changed code from the base, and drops files the PR added", () => {
    const head = tree({ "src/url.py": "fixed", "src/new.py": "added by PR", "tests/test_url.py": "new test", ".git/HEAD": "x" });
    const base = tree({ "src/url.py": "buggy" });
    const parent = tree({});
    const out = buildRevertedTree(head, base, ["src/url.py", "src/new.py", "../escape.py"], parent);
    expect(fs.readFileSync(path.join(out, "src/url.py"), "utf8")).toBe("buggy");
    expect(fs.existsSync(path.join(out, "src/new.py"))).toBe(false);
    expect(fs.readFileSync(path.join(out, "tests/test_url.py"), "utf8")).toBe("new test");
    expect(fs.existsSync(path.join(out, ".git"))).toBe(false);
    expect(out.startsWith(parent)).toBe(true);
  });
});

describe("PrTestHonestyVerifier", () => {
  const head = () => tree({ "src/url.py": "fixed", "tests/test_url.py": "test" });
  const pullTarget = (changedFiles: string[]) =>
    makeTarget({
      ref: { owner: "acme", repo: "demo", number: 5, kind: "pull" },
      pull: { baseSha: "1".repeat(40), headSha: "2".repeat(40), changedFiles },
    });

  class ByDirSandbox implements Sandbox {
    runs: SandboxSpec[] = [];
    constructor(private readonly headDir: string, private readonly onHead: number, private readonly onReverted: number) {}
    async run(spec: SandboxSpec): Promise<SandboxResult> {
      this.runs.push(spec);
      return run(spec.repoDir === this.headDir ? this.onHead : this.onReverted);
    }
  }

  const ctx = (headDir: string, sandbox: Sandbox, changed = ["src/url.py", "tests/test_url.py"]): VerifyContext => ({
    target: pullTarget(changed),
    checkout: { dir: headDir, commit: "2".repeat(40) },
    sandbox,
    checkoutAt: async () => ({ dir: tree({ "src/url.py": "buggy" }), commit: "1".repeat(40) }),
  });
  const claim = makeClaim({ id: "p", type: "pr_claim", statement: "This PR fixes parsing and adds a test." });

  it("runs the PR's tests on the head and on the reverted copy, once per PR, and cleans up", async () => {
    const headDir = head();
    const sandbox = new ByDirSandbox(headDir, 0, 1);
    const verifier = new PrTestHonestyVerifier();
    const context = ctx(headDir, sandbox);
    expect((await verifier.verify(claim, context))?.verdict).toBe("reproduced");
    await verifier.verify(makeClaim({ id: "q", type: "pr_claim" }), context);
    expect(sandbox.runs).toHaveLength(2);
    expect(sandbox.runs[0]).toMatchObject({ image: "pramaan-python-test:1", repoDir: headDir });
    expect(sandbox.runs[0]?.command).toEqual(["python", "-m", "pytest", "-q", "-x", "-p", "no:cacheprovider", "--no-header", "tests/test_url.py"]);
    expect(fs.existsSync(sandbox.runs[1]?.repoDir ?? "")).toBe(false);
  });

  it("flags a PR whose tests pass even without its code change", async () => {
    const headDir = head();
    expect((await new PrTestHonestyVerifier().verify(claim, ctx(headDir, new ByDirSandbox(headDir, 0, 0))))?.verdict).toBe("contradicted");
  });

  it("notes a code change with no test, and does not try to run non-Python tests", async () => {
    const headDir = head();
    const noTests = await new PrTestHonestyVerifier().verify(claim, ctx(headDir, new ByDirSandbox(headDir, 0, 0), ["src/url.py"]));
    expect(noTests?.evidence[0]?.summary).toContain("no test files");
    const jsTests = await new PrTestHonestyVerifier().verify(claim, ctx(headDir, new ByDirSandbox(headDir, 0, 0), ["lib/a.js", "lib/a.test.js"]));
    expect(jsTests?.missing[0]).toContain("only runs pytest");
  });

  it("applies only to claims about the fix or its tests, not lint or test-count claims", () => {
    const v = new PrTestHonestyVerifier();
    const pr = (statement: string) => makeClaim({ id: "x", type: "pr_claim", statement, quote: statement });
    expect(v.appliesTo(pr("The fix adds guards at the top of chunked_even to validate sizes."))).toBe(true);
    expect(v.appliesTo(pr("The new tests fail on the base commit with ValueError."))).toBe(true);
    expect(v.appliesTo(pr("ruff check and ruff format --check passed."))).toBe(false);
    expect(v.appliesTo(pr("pytest -q passed with 767 tests and 21,194 subtests."))).toBe(false);
    expect(v.appliesTo(pr("Updated the README wording."))).toBe(false);
  });

  it("applies to behavior claims about the bug the tests cover, but not unrelated ones", () => {
    const v = new PrTestHonestyVerifier();
    const behavior = (statement: string) => makeClaim({ id: "b", type: "behavior", statement, quote: statement });
    expect(v.appliesTo(behavior("A negative size causes a ValueError when calling chunked_even."))).toBe(true);
    expect(v.appliesTo(behavior("The settings page shows a new tab."))).toBe(false);
  });

  it("stays silent for issues and docs-only PRs, and only applies to PR claims", async () => {
    const headDir = head();
    const sandbox = new ByDirSandbox(headDir, 0, 0);
    expect(await new PrTestHonestyVerifier().verify(claim, { ...ctx(headDir, sandbox), target: makeTarget() })).toBeNull();
    expect(await new PrTestHonestyVerifier().verify(claim, ctx(headDir, sandbox, ["README.md"]))).toBeNull();
    expect(new PrTestHonestyVerifier().appliesTo(makeClaim({ id: "l", type: "code_location", statement: "The fix lives in src/url.py." }))).toBe(false);
  });
});
