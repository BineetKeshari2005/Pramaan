import fs from "node:fs";
import path from "node:path";
import type { SandboxResult, TargetDocument, Verifier, VerifyContext } from "../ports";
import { shortSha } from "../static/references";
import type { Claim, Evidence, VerificationResult } from "../types";

export const PR_TESTS_VERIFIER = "pr-test-honesty";

/** Image with pytest preinstalled; build it once with `npm run sandbox:image` (see sandbox/python-test.Dockerfile). */
export const PYTHON_TEST_IMAGE = "pramaan-python-test:1";

const TEST_FILE = /(^|\/)(tests?|testing|__tests__)\/|(^|\/)test_[^/]+\.py$|_test\.py$|\.(test|spec)\.[cm]?[jt]sx?$/;
const NOT_CODE = /\.(md|rst|txt|adoc|png|jpe?g|gif|svg|ico|lock)$|(^|\/)(docs?|\.github)\/|(^|\/)(CHANGELOG|CHANGES|NEWS|LICENSE|AUTHORS)[^/]*$/i;

export function splitChangedFiles(changed: string[]): { tests: string[]; fix: string[] } {
  const tests = changed.filter((f) => TEST_FILE.test(f));
  const fix = changed.filter((f) => !TEST_FILE.test(f) && !NOT_CODE.test(f));
  return { tests, fix };
}

/** pytest: 0 = passed, 1 = tests failed, 2 = interrupted (e.g. a collection error from a missing import), 5 = none collected. */
const passed = (r: SandboxResult) => r.exitCode === 0;
const failedOnTests = (r: SandboxResult) => r.exitCode === 1 || r.exitCode === 2;

function tail(r: SandboxResult, lines = 25): string {
  const out = `${r.stdout}\n${r.stderr}`.trim().split("\n");
  return (out.length > lines ? ["…", ...out.slice(-lines)] : out).join("\n");
}

/**
 * Decides whether a pull request's own tests demonstrate its fix, from two sandboxed runs of
 * the same test files: with the PR's code, and with the PR's non-test changes reverted.
 */
export function judgeTestRuns(withFix: SandboxResult, withoutFix: SandboxResult, tests: string[], at: string): VerificationResult {
  const log = [
    `# pytest ${tests.join(" ")}`,
    `## with the PR's changes: exit ${withFix.timedOut ? "timeout" : withFix.exitCode}`,
    tail(withFix),
    `## with the PR's code changes reverted (tests kept): exit ${withoutFix.timedOut ? "timeout" : withoutFix.exitCode}`,
    tail(withoutFix),
  ].join("\n");
  const ev = (summary: string, kind: Evidence["kind"] = "failing_test"): Evidence => ({ kind, source: PR_TESTS_VERIFIER, summary, log });

  if (withFix.timedOut || withoutFix.timedOut) {
    return { verdict: "insufficient_evidence", evidence: [ev("The PR's tests did not finish within the time limit.", "plausible_text")], missing: ["Tests that run quickly in isolation."] };
  }
  if (withFix.exitCode === 5) {
    return { verdict: "insufficient_evidence", evidence: [ev("pytest collected no tests from the PR's test files.", "plausible_text")], missing: ["A test that exercises the change."] };
  }
  if (!passed(withFix)) {
    return {
      verdict: "insufficient_evidence",
      evidence: [ev(`The PR's own tests do not pass with its changes at ${at} in the offline sandbox (often missing dependencies).`, "plausible_text")],
      missing: ["The PR's tests passing in CI, or a list of the dependencies they need."],
    };
  }
  if (failedOnTests(withoutFix)) {
    return {
      verdict: "reproduced",
      evidence: [ev(`The PR's tests fail without its code changes and pass with them (${at}), so they demonstrate the fix.`)],
      missing: [],
    };
  }
  if (passed(withoutFix)) {
    return {
      verdict: "contradicted",
      evidence: [ev(`The PR's tests also pass with its code changes reverted (${at}), so they do not test the fix.`)],
      missing: ["A test that fails on the base code and passes with the fix."],
    };
  }
  return {
    verdict: "insufficient_evidence",
    evidence: [ev("Without the PR's code changes the tests could not run, so the comparison is inconclusive.", "plausible_text")],
    missing: ["Tests that can run against the base code."],
  };
}

/**
 * Copies `headDir` and puts every fix file back to its base version (or removes files the PR added).
 * Host-side file copying only. The copy lives under the project (not the system temp folder) because
 * Docker on macOS (Colima, Docker Desktop) can only mount folders under the home directory.
 */
export function buildRevertedTree(headDir: string, baseDir: string, fixFiles: string[], parent = path.resolve(".pramaan", "tmp")): string {
  fs.mkdirSync(parent, { recursive: true });
  const target = fs.mkdtempSync(path.join(parent, "revert-"));
  fs.cpSync(headDir, target, { recursive: true, filter: (src) => path.basename(src) !== ".git", verbatimSymlinks: true });
  for (const file of fixFiles) {
    const rel = path.normalize(file);
    if (rel.startsWith("..") || path.isAbsolute(rel)) continue;
    const dest = path.join(target, rel);
    const base = path.join(baseDir, rel);
    if (fs.existsSync(base) && fs.lstatSync(base).isFile()) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(base, dest);
    } else {
      fs.rmSync(dest, { force: true });
    }
  }
  return target;
}

export interface PrTestOptions {
  image: string;
  timeoutMs: number;
  memoryMb: number;
  cpus: number;
}

export const DEFAULT_PR_TEST_OPTIONS: PrTestOptions = { image: PYTHON_TEST_IMAGE, timeoutMs: 120_000, memoryMb: 1024, cpus: 1 };

/**
 * For a pull request: runs the Python test files the PR changes, once on the PR head and once with
 * the PR's non-test changes reverted to the base commit, both inside the sandbox.
 */
export class PrTestHonestyVerifier implements Verifier {
  readonly name = PR_TESTS_VERIFIER;
  private readonly results = new WeakMap<TargetDocument, Promise<VerificationResult | null>>();

  constructor(private readonly options: PrTestOptions = DEFAULT_PR_TEST_OPTIONS) {}

  appliesTo(claim: Claim): boolean {
    return claim.type === "pr_claim";
  }

  verify(claim: Claim, ctx: VerifyContext): Promise<VerificationResult | null> {
    // The test runs answer a question about the whole PR; do them once and share the result.
    let result = this.results.get(ctx.target);
    if (!result) {
      result = this.run(ctx);
      this.results.set(ctx.target, result);
    }
    return result;
  }

  private async run(ctx: VerifyContext): Promise<VerificationResult | null> {
    const pull = ctx.target.pull;
    if (!pull || !ctx.sandbox) return null;
    const { tests, fix } = splitChangedFiles(pull.changedFiles);
    const at = `${ctx.target.ref.owner}/${ctx.target.ref.repo} ${shortSha(pull.baseSha)}..${shortSha(pull.headSha)}`;

    if (fix.length === 0) return null;
    if (tests.length === 0) {
      return {
        verdict: "insufficient_evidence",
        evidence: [{ kind: "plausible_text", source: this.name, summary: `The PR changes ${fix.length} code file(s) but no test files, so no test demonstrates the change.` }],
        missing: ["A test that fails without the change and passes with it."],
      };
    }
    const pyTests = tests.filter((t) => t.endsWith(".py"));
    if (pyTests.length === 0) {
      return {
        verdict: "insufficient_evidence",
        evidence: [],
        missing: ["The PR's tests are not Python; the offline sandbox only runs pytest suites, so they were not executed."],
      };
    }
    if (!ctx.checkoutAt) return null;
    if (ctx.sandbox.isAvailable && !(await ctx.sandbox.isAvailable())) {
      return { verdict: "insufficient_evidence", evidence: [], missing: ["The Docker sandbox is not running, so the PR's tests were not executed."] };
    }

    const base = await ctx.checkoutAt(pull.baseSha);
    const reverted = buildRevertedTree(ctx.checkout.dir, base.dir, fix);
    try {
      const spec = (repoDir: string) => ({
        image: this.options.image,
        repoDir,
        command: ["python", "-m", "pytest", "-q", "-x", "-p", "no:cacheprovider", "--no-header", ...pyTests],
        env: { PYTHONPATH: "/repo:/repo/src" },
        timeoutMs: this.options.timeoutMs,
        memoryMb: this.options.memoryMb,
        cpus: this.options.cpus,
      });
      const withFix = await ctx.sandbox.run(spec(ctx.checkout.dir));
      if (/Unable to find image|pull access denied/i.test(withFix.stderr)) {
        return { verdict: "insufficient_evidence", evidence: [], missing: [`The sandbox test image is missing; build it with \`npm run sandbox:image\`.`] };
      }
      const withoutFix = await ctx.sandbox.run(spec(reverted));
      return judgeTestRuns(withFix, withoutFix, pyTests, at);
    } finally {
      fs.rmSync(reverted, { recursive: true, force: true });
    }
  }
}
