import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectProvidedEvidence, mineReferences, withDetectedEvidence } from "../../src/core/claims";
import type { TargetDocument } from "../../src/core/ports";
import { makeClaim, makeTarget } from "../fakes";

const issue = (name: string) =>
  JSON.parse(readFileSync(join(import.meta.dirname, "../fixtures/issues", name), "utf8")) as TargetDocument;

describe("detectProvidedEvidence on real reports", () => {
  it("finds the traceback, the exact command line and code blocks in the sqlmap report", () => {
    expect(detectProvidedEvidence(issue("stack-trace-sqlmap-6154.json"))).toEqual(
      expect.arrayContaining(["stack_trace", "repro_steps", "code_snippet"]),
    );
  });

  it("finds the REPL repro in the js-abbreviation-number report", () => {
    expect(detectProvidedEvidence(issue("repro-js-abbreviation-number-39.json"))).toEqual(
      expect.arrayContaining(["repro_steps", "code_snippet"]),
    );
  });

  it("finds nothing in the vague nebra report", () => {
    expect(detectProvidedEvidence(issue("vague-nebra-157.json"))).not.toContain("stack_trace");
    expect(detectProvidedEvidence(issue("vague-nebra-157.json"))).not.toContain("repro_steps");
  });
});

describe("detectProvidedEvidence patterns", () => {
  const detect = (body: string) => detectProvidedEvidence(makeTarget({ body, comments: [] }));

  it.each([
    ["stack_trace", "Exception in thread \"main\" java.lang.NullPointerException\n\tat org.a.B.c(B.java:4)"],
    ["stack_trace", "TypeError: x\n    at render (/srv/app.js:2:10)"],
    ["repro_steps", "Steps to reproduce:\n1. run it"],
    ["repro_steps", "```\n$ app --config ''\n```"],
    ["logs", "2026-10-01 10:00:01 ERROR failed to connect"],
    ["test", "```python\ndef test_empty():\n    assert f('') == 0\n```"],
    ["screenshot", "![bug](https://github.com/user-attachments/assets/abc.png)"],
  ] as const)("detects %s", (kind, body) => {
    expect(detect(body)).toContain(kind);
  });

  it("only counts the original author's comments", () => {
    const doc = makeTarget({
      author: "reporter",
      body: "It crashes.",
      comments: [{ author: "other", body: "Traceback (most recent call last):\n  File \"a.py\", line 1, in f", createdAt: "" }],
    });
    expect(detectProvidedEvidence(doc)).not.toContain("stack_trace");
  });
});

describe("withDetectedEvidence", () => {
  it("adds report-level evidence to behavior, security and PR claims only, replacing 'none'", () => {
    const [behavior, location] = withDetectedEvidence(
      [makeClaim({ id: "b", type: "behavior", evidenceProvided: ["none"] }), makeClaim({ id: "l", type: "code_location" })],
      ["stack_trace"],
    );
    expect(behavior?.evidenceProvided).toEqual(["stack_trace"]);
    expect(location?.evidenceProvided).toEqual([]);
  });
});

describe("mineReferences", () => {
  const claim = (statement: string, refs: Partial<{ files: string[]; symbols: string[] }> = {}) =>
    makeClaim({
      id: "m1",
      type: "behavior",
      statement,
      quote: statement,
      references: { files: [], symbols: [], lines: [], versions: [], commands: [], ...refs },
    });

  it("copies backticked code tokens from the claim text into its references", () => {
    const [mined] = mineReferences([
      claim("Invalid IDs are rejected in `getTask()` and `deleteTask()` before `ValidationTaskId.java` is used."),
    ]);
    expect(mined?.references.symbols).toEqual(["getTask()", "deleteTask()"]);
    expect(mined?.references.files).toEqual(["ValidationTaskId.java"]);
  });

  it("keeps existing references and skips fragments, versions and plain words", () => {
    const [mined] = mineReferences([
      claim("Since `v2.3.0`, `return x + 1` and `config` behave the same in `src/url.py`.", { symbols: ["parse_url"] }),
    ]);
    expect(mined?.references.symbols).toEqual(["parse_url"]);
    expect(mined?.references.files).toEqual(["src/url.py"]);
  });

  it("returns the claim unchanged when there is nothing to mine", () => {
    const original = claim("The app crashes on start.");
    expect(mineReferences([original])[0]).toBe(original);
  });
});
