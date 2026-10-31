import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { VerifyContext } from "../../src/core";
import {
  codeSymbol,
  createStaticVerifiers,
  looksLikePath,
  parseStackTrace,
  ReferencesVerifier,
  RepoIndex,
  StackTraceVerifier,
} from "../../src/core/static";
import { makeClaim, makeTarget } from "../fakes";

const demo = join(import.meta.dirname, "../fixtures/repos/demo");
const SHA = "0123456789abcdef0123456789abcdef01234567";
const indexFor = () => new RepoIndex(demo);

const ctx = (body = ""): VerifyContext => ({
  target: makeTarget({ body, ref: { owner: "acme", repo: "demo", number: 7, kind: "issue" } }),
  checkout: { dir: demo, commit: SHA },
});

const refs = (r: Partial<{ files: string[]; symbols: string[]; lines: Array<{ file: string; line: number }> }>) => ({
  files: [],
  symbols: [],
  lines: [],
  versions: [],
  commands: [],
  ...r,
});

describe("reference filters (avoid false contradictions)", () => {
  it("treats only path-like strings as files", () => {
    expect(looksLikePath("src/url.py")).toBe(true);
    expect(looksLikePath("url.py")).toBe(true);
    expect(looksLikePath("js-abbreviation-number")).toBe(false);
  });

  it("searches only identifier-like symbols, and skips built-in exception types", () => {
    expect(codeSymbol("parse_url_v2()")).toBe("parse_url_v2");
    expect(codeSymbol("conf.dumper.singleString")).toBe("singleString");
    expect(codeSymbol("unabbreviateNumber")).toBe("unabbreviateNumber");
    expect(codeSymbol("--force-ssl")).toBe("--force-ssl");
    expect(codeSymbol("config")).toBeUndefined();
    expect(codeSymbol("AttributeError")).toBeUndefined();
    expect(codeSymbol("ab")).toBeUndefined();
  });
});

describe("ReferencesVerifier", () => {
  const verifier = new ReferencesVerifier(indexFor);

  it("contradicts a claim about a function that does not exist, with a clear summary", async () => {
    const claim = makeClaim({ id: "c1", type: "behavior", references: refs({ files: ["src/url.py"], symbols: ["parse_url_v2()"] }) });
    const result = await verifier.verify(claim, ctx());
    expect(result?.verdict).toBe("contradicted");
    expect(result?.evidence[0]?.summary).toBe("`parse_url_v2` is not defined or used anywhere in acme/demo at 0123456.");
    expect(result?.evidence.some((e) => e.summary.startsWith("File `src/url.py` exists"))).toBe(true);
  });

  it("contradicts a missing file and suggests files with the same name", async () => {
    const claim = makeClaim({ id: "c1", references: refs({ files: ["lib/url.py"] }) });
    const result = await verifier.verify(claim, ctx());
    expect(result?.verdict).toBe("contradicted");
    expect(result?.evidence[0]?.summary).toContain("Files with the same name: `src/url.py`");
  });

  it("contradicts a line number past the end of the file", async () => {
    const claim = makeClaim({ id: "c1", references: refs({ files: ["src/url.py"], lines: [{ file: "src/url.py", line: 88 }] }) });
    const result = await verifier.verify(claim, ctx());
    expect(result?.verdict).toBe("contradicted");
    expect(result?.evidence[0]?.summary).toContain("has only 19 lines, so line 88 does not exist");
  });

  it("confirms a code_location claim statically, with SHA-pinned permalinks and an excerpt", async () => {
    const claim = makeClaim({ id: "c1", type: "code_location", references: refs({ files: ["src/url.py"], symbols: ["parse_url"] }) });
    const result = await verifier.verify(claim, ctx());
    expect(result?.verdict).toBe("reproduced");
    const def = result?.evidence.find((e) => e.summary.includes("is defined"));
    expect(def?.location?.permalink).toBe(`https://github.com/acme/demo/blob/${SHA}/src/url.py#L8`);
    expect(def?.log).toContain("8 | def parse_url(value):");
  });

  it("does not call a behavior claim proven just because the code exists", async () => {
    const claim = makeClaim({ id: "c1", type: "behavior", references: refs({ symbols: ["parse_url"] }) });
    const result = await verifier.verify(claim, ctx());
    expect(result?.verdict).toBe("insufficient_evidence");
    expect(result?.missing[0]).toContain("was not executed");
  });

  it("downgrades a symbol that is used but never defined to weak evidence", async () => {
    const claim = makeClaim({ id: "c1", type: "code_location", references: refs({ symbols: ["singleString"] }) });
    const result = await verifier.verify(claim, ctx());
    expect(result?.evidence[0]?.kind).toBe("plausible_text");
    expect(result?.verdict).toBe("insufficient_evidence");
  });

  it("does not count the reporter's own files, machine paths or dependency paths as missing repo files", async () => {
    const claim = makeClaim({
      id: "c1",
      type: "behavior",
      references: refs({ files: ["mini.vim", "/home/u/.vim/plugged/demo/x.vim", "gems/3.4.0/gems/thin-1.8.2/lib/thin.rb", "C:\\work\\atw.pyc", "other/project/file.py"] }),
    });
    const result = await verifier.verify(claim, ctx());
    expect(result?.verdict).toBe("insufficient_evidence");
    expect(result?.evidence.map((e) => e.summary)).toEqual(["`mini.vim` is not in the repository; it may be the reporter's own file."]);
  });

  it("still contradicts a missing path inside one of the repository's own folders", async () => {
    const result = await verifier.verify(makeClaim({ id: "c1", references: refs({ files: ["src/url_v2.py"] }) }), ctx());
    expect(result?.verdict).toBe("contradicted");
  });

  it("only contradicts a missing symbol when the claim ties it to the repository's code", async () => {
    const loose = await verifier.verify(makeClaim({ id: "c1", type: "behavior", references: refs({ symbols: ["a_decorator"] }) }), ctx());
    expect(loose?.verdict).toBe("insufficient_evidence");
    expect(loose?.evidence[0]?.summary).toContain("may come from the reporter's own code or a dependency");
    const tied = await verifier.verify(makeClaim({ id: "c1", type: "code_location", references: refs({ symbols: ["a_decorator"] }) }), ctx());
    expect(tied?.verdict).toBe("contradicted");
  });

  it("ignores package names and plain words instead of contradicting them", async () => {
    const claim = makeClaim({ id: "c1", references: refs({ files: ["js-abbreviation-number"], symbols: ["config", "TypeError"] }) });
    expect(verifier.appliesTo(claim)).toBe(false);
  });
});

const TRACE = `Traceback (most recent call last):
  File "/home/alice/demo/lib/controller/action.py", line 11, in start
    return action(conf)
  File "/home/alice/demo/lib/controller/action.py", line 7, in action
    return conf.dumper.singleString(rest)
  File "/usr/lib/python3.12/site-packages/requests/api.py", line 59, in request
AttributeError: 'NoneType' object has no attribute 'singleString'`;

describe("parseStackTrace", () => {
  it("parses Python frames and the exception type", () => {
    expect(parseStackTrace(TRACE)).toEqual({
      frames: [
        { file: "/home/alice/demo/lib/controller/action.py", line: 11, func: "start" },
        { file: "/home/alice/demo/lib/controller/action.py", line: 7, func: "action" },
        { file: "/usr/lib/python3.12/site-packages/requests/api.py", line: 59, func: "request" },
      ],
      exception: "AttributeError",
    });
  });

  it("parses JavaScript and Java frames", () => {
    const js = parseStackTrace("TypeError: x is not a function\n    at renderPage (/srv/app/web/app.js:2:10)\n    at node:internal/main:1:1");
    expect(js.frames).toEqual([{ file: "/srv/app/web/app.js", line: 2, func: "renderPage" }]);
    expect(js.exception).toBe("TypeError");
    const java = parseStackTrace("java.lang.IllegalStateException: boom\n\tat org.acme.Widget.render(Widget.java:42)");
    expect(java.frames).toEqual([{ file: "org/acme/Widget.java", line: 42, func: "render" }]);
  });
});

describe("StackTraceVerifier", () => {
  const verifier = new StackTraceVerifier(indexFor);
  const claim = makeClaim({ id: "c1", type: "behavior", statement: "An AttributeError is raised in action.", quote: "AttributeError", references: refs({}) });

  it("reports a trace whose in-repo frames all match the code, skipping library frames", async () => {
    const result = await verifier.verify(claim, ctx(TRACE));
    expect(result?.verdict).toBe("insufficient_evidence");
    expect(result?.evidence[0]?.summary).toBe(
      "All 2 stack frames inside the repository match the code at 0123456 (1 frame outside the repository was skipped), so the trace is consistent with this code path.",
    );
    expect(result?.missing).toEqual(["The crash itself was not reproduced by running the reported command."]);
  });

  it("contradicts a trace through a function that does not exist anywhere", async () => {
    const fake = TRACE.replace("in action", "in action_v2");
    const result = await verifier.verify(claim, ctx(fake));
    expect(result?.verdict).toBe("contradicted");
    expect(result?.evidence[0]?.summary).toContain("`action_v2` does not exist anywhere in the repository");
  });

  it("treats shifted line numbers as a version mismatch, not a fabrication", async () => {
    const shifted = TRACE.replace("line 7, in action", "line 3, in action");
    const result = await verifier.verify(claim, ctx(shifted));
    expect(result?.verdict).toBe("insufficient_evidence");
    expect(result?.missing[0]).toContain("probably from another version");
  });

  it("contradicts frames in repo-relative files that do not exist in the repository", async () => {
    const relative = TRACE.replace('"/home/alice/demo/lib/controller/action.py", line 11', '"lib/controller/runner.py", line 11');
    const result = await verifier.verify(claim, ctx(relative));
    expect(result?.verdict).toBe("contradicted");
  });

  it("skips frames from the reporter's machine (entry-point scripts, environments) instead of contradicting", async () => {
    const machine = TRACE.replace(
      '"/home/alice/demo/lib/controller/action.py", line 11, in start',
      '"/home/alice/miniconda3/envs/py39/bin/demo-cli", line 5, in <module>',
    ).replace('"/home/alice/demo/lib/controller/action.py", line 7', '"C:\\\\work\\\\.env\\\\Scripts\\\\demo-script.py", line 33');
    const result = await verifier.verify(claim, ctx(machine));
    expect(result?.verdict).not.toBe("contradicted");
  });

  it("stays silent for claims unrelated to the trace, and for reports without one", async () => {
    const unrelated = makeClaim({ id: "c2", type: "behavior", statement: "The docs page has a typo in it.", quote: "typo", references: refs({}) });
    expect(await verifier.verify(unrelated, ctx(TRACE))).toBeNull();
    expect(await verifier.verify(claim, ctx("no trace here"))).toBeNull();
  });
});

describe("createStaticVerifiers", () => {
  it("returns the reference, stack-trace and pr-diff verifiers", () => {
    expect(createStaticVerifiers().map((v) => v.name)).toEqual(["code-references", "stack-trace", "pr-diff"]);
  });
});
