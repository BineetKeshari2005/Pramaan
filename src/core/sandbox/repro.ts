import fs from "node:fs";
import path from "node:path";
import type { SandboxResult, TargetDocument, Verifier, VerifyContext } from "../ports";
import { shortSha } from "../static/references";
import { parseStackTrace, reportText } from "../static/stack-trace";
import type { Claim, Evidence, VerificationResult } from "../types";
import { extractPythonSnippets, type Snippet } from "./snippets";

export const REPRO_VERIFIER = "sandbox-repro";

export interface ReproOptions {
  image: string;
  timeoutMs: number;
  memoryMb: number;
  cpus: number;
}

export const DEFAULT_REPRO_OPTIONS: ReproOptions = {
  image: "python:3.12-slim",
  timeoutMs: 30_000,
  memoryMb: 512,
  cpus: 1,
};

// Decodes the snippet from the environment so it never passes through a shell.
const RUNNER =
  "import base64,os;exec(compile(base64.b64decode(os.environ['PRAMAAN_SNIPPET']).decode(),'<report snippet>','exec'),{'__name__':'__main__'})";

const CRASH_WORDS = /\b(crash|crashes|raise[sd]?|throws?|exception|error|traceback|fails?|failing|segfault)\b/i;
const EXC_NAME = /\b([A-Z][A-Za-z0-9_]*(?:Error|Exception|Exit|Interrupt))\b/;
const NETWORK_FAILURE =
  /Temporary failure in name resolution|Name or service not known|Network is unreachable|nodename nor servname|socket\.gaierror|\b(?:URLError|ConnectionError|NewConnectionError|MaxRetryError|ConnectTimeout(?:Error)?)\b/;

/** The exception type at the end of a Python traceback, if the run raised one. */
export function raisedException(stderr: string): string | undefined {
  if (!/Traceback \(most recent call last\)/.test(stderr)) return undefined;
  const last = stderr.trim().split(/\r?\n/).filter(Boolean).at(-1) ?? "";
  return /^([A-Za-z_][\w.]*)(?::|$)/.exec(last)?.[1]?.split(".").at(-1);
}

function missingModule(stderr: string): string | undefined {
  return /ModuleNotFoundError: No module named '([\w.]+)'/.exec(stderr)?.[1]?.split(".")[0];
}

function runLog(snippet: Snippet, result: SandboxResult): string {
  const out = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join("\n").split("\n");
  const tail = out.length > 60 ? ["…", ...out.slice(-60)] : out;
  return [
    "# snippet from the report (run with python3 inside the sandbox)",
    snippet.code,
    `# exit code ${result.timedOut ? "timeout" : result.exitCode} after ${(result.durationMs / 1000).toFixed(1)}s`,
    ...tail,
  ].join("\n");
}

/**
 * Decides a claim from one sandboxed run of the reporter's own snippet. Exported separately so the
 * decision rules are testable without Docker.
 */
export function judgeRun(
  claim: Claim,
  doc: TargetDocument,
  snippet: Snippet,
  result: SandboxResult,
  repoHas: (module: string) => boolean,
  at: string,
): VerificationResult {
  const log = runLog(snippet, result);
  const ev = (summary: string, kind: Evidence["kind"] = "executed_repro"): Evidence => ({ kind, source: REPRO_VERIFIER, summary, log });
  const text = `${claim.statement} ${claim.quote}`;
  const claimed = EXC_NAME.exec(text)?.[1] ?? (CRASH_WORDS.test(text) ? parseStackTrace(reportText(doc)).exception : undefined);
  const crashClaim = claimed !== undefined || CRASH_WORDS.test(text);
  const raised = raisedException(result.stderr);

  if (result.timedOut) {
    return { verdict: "insufficient_evidence", evidence: [ev(`The reporter's snippet did not finish within the time limit at ${at}.`)], missing: ["A snippet that finishes quickly and shows the problem."] };
  }
  // The sandbox has no network on purpose, so a network failure says nothing about the claim.
  if (NETWORK_FAILURE.test(result.stderr)) {
    return {
      verdict: "insufficient_evidence",
      evidence: [ev("The snippet needs network access, which the sandbox blocks on purpose, so its result says nothing about the claim.", "plausible_text")],
      missing: ["A reproduction that does not depend on a remote server, for example with a local test fixture."],
    };
  }
  const module = missingModule(result.stderr);
  if (module && !repoHas(module)) {
    return {
      verdict: "insufficient_evidence",
      evidence: [ev(`The snippet needs the third-party module \`${module}\`, which is not installed in the offline sandbox, so it could not be run.`, "plausible_text")],
      missing: [`A reproduction that runs with only the repository's own code, or a list of required packages and versions.`],
    };
  }

  if (claimed) {
    if (raised === claimed) {
      return { verdict: "reproduced", evidence: [ev(`Running the reporter's snippet at ${at} raised \`${raised}\`, as the report says.`)], missing: [] };
    }
    if (result.exitCode === 0) {
      return {
        verdict: "not_reproduced",
        evidence: [ev(`Running the reporter's snippet at ${at} finished without raising \`${claimed}\`.`)],
        missing: ["The exact version, environment and input under which the error appears."],
      };
    }
    return {
      verdict: "insufficient_evidence",
      evidence: [ev(`Running the reporter's snippet at ${at} raised \`${raised ?? `exit code ${result.exitCode}`}\`, not the reported \`${claimed}\`.`)],
      missing: ["Clarify which error occurs; the snippet fails differently in this environment."],
    };
  }
  if (crashClaim) {
    if (result.exitCode !== 0 && raised) {
      return { verdict: "reproduced", evidence: [ev(`Running the reporter's snippet at ${at} failed with \`${raised}\`.`)], missing: [] };
    }
    if (result.exitCode === 0) {
      return {
        verdict: "not_reproduced",
        evidence: [ev(`Running the reporter's snippet at ${at} finished without an error.`)],
        missing: ["The exact version, environment and input under which the failure appears."],
      };
    }
  }
  return {
    verdict: "insufficient_evidence",
    evidence: [ev(`Ran the reporter's snippet at ${at}; its output is attached for comparison with the claim.`)],
    missing: ["The expected and the actual output, so the run can be compared automatically."],
  };
}

/**
 * Runs Python code pasted in the report (a >>> session or a ```python block) against the
 * repository at the verified commit, inside the sandbox, and grades the claim from what happened.
 */
export class PythonReproVerifier implements Verifier {
  readonly name = REPRO_VERIFIER;
  private readonly runs = new WeakMap<TargetDocument, Map<string, Promise<SandboxResult>>>();

  constructor(private readonly options: ReproOptions = DEFAULT_REPRO_OPTIONS) {}

  appliesTo(claim: Claim): boolean {
    return claim.type === "behavior" || claim.type === "security_impact";
  }

  async verify(claim: Claim, ctx: VerifyContext): Promise<VerificationResult | null> {
    const snippet = extractPythonSnippets(reportText(ctx.target))[0];
    if (!snippet || !ctx.sandbox || !looksLikePythonRepo(ctx.checkout.dir)) return null;
    const at = `${ctx.target.ref.owner}/${ctx.target.ref.repo} at ${shortSha(ctx.checkout.commit)}`;

    if (ctx.sandbox.isAvailable && !(await ctx.sandbox.isAvailable())) {
      return {
        verdict: "insufficient_evidence",
        evidence: [],
        missing: ["The report includes a Python snippet, but the Docker sandbox is not running, so it was not executed."],
      };
    }

    // One run per report and commit, shared by all claims it applies to.
    let byCommit = this.runs.get(ctx.target);
    if (!byCommit) this.runs.set(ctx.target, (byCommit = new Map()));
    let run = byCommit.get(ctx.checkout.commit);
    if (!run) {
      run = ctx.sandbox.run({
        image: this.options.image,
        repoDir: ctx.checkout.dir,
        command: ["python3", "-c", RUNNER],
        env: { PRAMAAN_SNIPPET: Buffer.from(snippet.code).toString("base64"), PYTHONPATH: "/repo:/repo/src:/repo/lib" },
        timeoutMs: this.options.timeoutMs,
        memoryMb: this.options.memoryMb,
        cpus: this.options.cpus,
      });
      byCommit.set(ctx.checkout.commit, run);
    }
    const result = await run;
    const repoHas = (module: string) =>
      ["", "src", "lib"].some((base) => {
        const p = path.join(ctx.checkout.dir, base, module);
        return fs.existsSync(p) || fs.existsSync(`${p}.py`);
      });
    return judgeRun(claim, ctx.target, snippet, result, repoHas, at);
  }
}

/** A Python project marker, or .py files at the top level or one directory down. */
export function looksLikePythonRepo(dir: string): boolean {
  if (["setup.py", "pyproject.toml", "setup.cfg", "requirements.txt"].some((f) => fs.existsSync(path.join(dir, f)))) return true;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    if (entries.some((e) => e.isFile() && e.name.endsWith(".py"))) return true;
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules")
      .some((d) => fs.readdirSync(path.join(dir, d.name)).some((f) => f.endsWith(".py")));
  } catch {
    return false;
  }
}
