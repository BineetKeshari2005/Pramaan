import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { SandboxResult, VerifyContext } from "../../src/core";
import {
  DockerSandbox,
  extractPythonSnippets,
  judgeRun,
  looksLikePythonRepo,
  PythonReproVerifier,
  raisedException,
} from "../../src/core/sandbox";
import { FakeSandbox, makeClaim, makeTarget } from "../fakes";

const demo = join(import.meta.dirname, "../fixtures/repos/demo");
const SHA = "0123456789abcdef0123456789abcdef01234567";
const snippet = { language: "python" as const, code: "from src.url import parse_url\nparse_url('')", source: "fence" as const };
const run = (overrides: Partial<SandboxResult>): SandboxResult => ({ exitCode: 0, stdout: "", stderr: "", timedOut: false, durationMs: 120, ...overrides });
const traceback = (exc: string) => `Traceback (most recent call last):\n  File "<report snippet>", line 2, in <module>\n${exc}`;
const doc = makeTarget({ body: "parse_url('') raises ValueError" });
const claim = (statement: string) => makeClaim({ id: "c1", type: "behavior", statement, quote: statement });
const judge = (statement: string, result: SandboxResult) => judgeRun(claim(statement), doc, snippet, result, () => false, "acme/demo at 0123456");

describe("extractPythonSnippets", () => {
  it("rebuilds a >>> session without its printed output", () => {
    const text = "Repro:\n```\n>>> from lib import f\n>>> f('10K')\n10\n>>> for x in [1]:\n...     print(x)\n1\n```";
    expect(extractPythonSnippets(text)).toEqual([
      { language: "python", source: "repl", code: "from lib import f\nf('10K')\nfor x in [1]:\n    print(x)" },
    ]);
  });

  it("takes fenced Python but skips tracebacks, shell commands and other languages", () => {
    const text = [
      "```python\nimport demo\ndemo.run()\n```",
      "```python\nTraceback (most recent call last):\n  File \"a.py\", line 1, in <module>\nValueError\n```",
      "```bash\n$ pip install demo\n```",
      "```js\nconsole.log(1)\n```",
    ].join("\n");
    expect(extractPythonSnippets(text).map((s) => s.code)).toEqual(["import demo\ndemo.run()"]);
  });

  it("finds a >>> session pasted outside a fence", () => {
    expect(extractPythonSnippets("It fails:\n>>> import demo\n>>> demo.go()\nboom")[0]?.code).toBe("import demo\ndemo.go()");
  });
});

describe("raisedException", () => {
  it("reads the exception type from the end of a traceback", () => {
    expect(raisedException(traceback("ValueError: empty url"))).toBe("ValueError");
    expect(raisedException(traceback("urllib.error.URLError: <urlopen error>"))).toBe("URLError");
    expect(raisedException("just output")).toBeUndefined();
  });
});

describe("judgeRun", () => {
  it("reproduces when the snippet raises the exception the claim names", () => {
    const r = judge("parse_url('') raises ValueError", run({ exitCode: 1, stderr: traceback("ValueError: empty url") }));
    expect(r.verdict).toBe("reproduced");
    expect(r.evidence[0]).toMatchObject({ kind: "executed_repro", source: "sandbox-repro" });
    expect(r.evidence[0]?.log).toContain("# exit code 1");
  });

  it("does not reproduce when the snippet runs cleanly", () => {
    expect(judge("parse_url('') raises ValueError", run({ exitCode: 0 })).verdict).toBe("not_reproduced");
    expect(judge("Calling parse_url crashes the app", run({ exitCode: 0 })).verdict).toBe("not_reproduced");
  });

  it("stays undecided when a different exception is raised", () => {
    const r = judge("parse_url('') raises ValueError", run({ exitCode: 1, stderr: traceback("TypeError: bad") }));
    expect(r.verdict).toBe("insufficient_evidence");
    expect(r.evidence[0]?.summary).toContain("raised `TypeError`, not the reported `ValueError`");
  });

  it("treats a missing third-party module as an environment gap, not a verdict", () => {
    const r = judge("x raises ValueError", run({ exitCode: 1, stderr: traceback("ModuleNotFoundError: No module named 'numpy'") }));
    expect(r.verdict).toBe("insufficient_evidence");
    expect(r.evidence[0]?.kind).toBe("plausible_text");
  });

  it("never counts the sandbox's blocked network as reproducing a connection error", () => {
    const r = judge(
      "requests.get raises ConnectionError for this URL",
      run({ exitCode: 1, stderr: traceback("requests.exceptions.ConnectionError: Temporary failure in name resolution") }),
    );
    expect(r.verdict).toBe("insufficient_evidence");
    expect(r.evidence[0]?.summary).toContain("network access");
  });

  it("stays undecided on a timeout or when the claim is not about an error", () => {
    expect(judge("x raises ValueError", run({ exitCode: null, timedOut: true })).verdict).toBe("insufficient_evidence");
    expect(judge("The result is formatted with two decimals", run({ exitCode: 0, stdout: "1.5" })).verdict).toBe("insufficient_evidence");
  });
});

describe("PythonReproVerifier", () => {
  const body = "Calling parse_url with an empty string raises ValueError:\n```python\nfrom src.url import parse_url\nparse_url('')\n```";
  const ctx = (sandbox?: VerifyContext["sandbox"]): VerifyContext => ({
    target: makeTarget({ body, ref: { owner: "acme", repo: "demo", number: 1, kind: "issue" } }),
    checkout: { dir: demo, commit: SHA },
    sandbox,
  });
  const c = claim("parse_url('') raises ValueError");

  it("runs the report's snippet once per report in the sandbox, with the repo on PYTHONPATH", async () => {
    const sandbox = new FakeSandbox(run({ exitCode: 1, stderr: traceback("ValueError: empty url") }));
    const verifier = new PythonReproVerifier();
    const context = ctx(sandbox);
    expect((await verifier.verify(c, context))?.verdict).toBe("reproduced");
    await verifier.verify(claim("parse_url fails with ValueError on empty input"), context);
    expect(sandbox.runs).toHaveLength(1);
    expect(sandbox.runs[0]).toMatchObject({ image: "python:3.12-slim", repoDir: demo, command: ["python3", "-c", expect.stringContaining("PRAMAAN_SNIPPET")] });
    expect(Buffer.from(sandbox.runs[0]?.env?.PRAMAAN_SNIPPET ?? "", "base64").toString()).toBe("from src.url import parse_url\nparse_url('')");
  });

  it("says so when Docker is not running instead of failing", async () => {
    const down = Object.assign(new FakeSandbox(run({})), { isAvailable: async () => false });
    const r = await new PythonReproVerifier().verify(c, ctx(down));
    expect(r?.verdict).toBe("insufficient_evidence");
    expect(r?.missing[0]).toContain("sandbox is not running");
    expect(down.runs).toHaveLength(0);
  });

  it("stays silent without a sandbox, a snippet, or a Python repository", async () => {
    expect(await new PythonReproVerifier().verify(c, ctx(undefined))).toBeNull();
    const noSnippet = { ...ctx(new FakeSandbox(run({}))), target: makeTarget({ body: "It crashes." }) };
    expect(await new PythonReproVerifier().verify(c, noSnippet)).toBeNull();
    expect(looksLikePythonRepo(demo)).toBe(true);
    expect(looksLikePythonRepo(join(demo, "web"))).toBe(false);
  });
});

// Runs real containers; enable locally with PRAMAAN_DOCKER_TESTS=1 (CI has no Docker daemon).
describe.skipIf(process.env.PRAMAAN_DOCKER_TESTS !== "1")("real Docker sandbox", () => {
  const sandbox = new DockerSandbox();
  const py = (code: string, timeoutMs = 20_000) =>
    sandbox.run({ image: "python:3.12-slim", repoDir: demo, command: ["python3", "-c", code], timeoutMs, memoryMb: 256, cpus: 1, env: { PYTHONPATH: "/repo" } });

  it("reproduces the demo crash, blocks the network and writes, and enforces the time limit", async () => {
    expect(raisedException((await py("from src.url import parse_url\nparse_url('')")).stderr)).toBe("ValueError");
    expect((await py("import socket; socket.create_connection(('1.1.1.1', 80), timeout=3)")).exitCode).not.toBe(0);
    expect((await py("open('/repo/x', 'w')")).stderr).toContain("Read-only file system");
    expect((await py("import os; print(os.getuid())")).stdout.trim()).toBe("65534");
    expect((await py("while True: pass", 3000)).timedOut).toBe(true);
  }, 60_000);
});
