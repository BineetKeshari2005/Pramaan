import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectProvidedEvidence, withDetectedEvidence } from "../../src/core/claims";
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
