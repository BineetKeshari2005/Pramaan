import { describe, expect, it } from "vitest";
import { bestGuess, type ClaimAssessment, CONTEXT_ONLY, type Evidence } from "../src/core";
import { renderReportMarkdown } from "../src/core/report";
import { ReportSchema } from "../src/core/types";
import { makeClaim } from "./fakes";

const ev = (kind: Evidence["kind"], source = "code-references", summary: string = kind): Evidence => ({ kind, source, summary });
const assessed = (o: Partial<ClaimAssessment> & { claim?: ClaimAssessment["claim"] }): ClaimAssessment => ({
  claim: makeClaim({ id: "c", type: "behavior", references: { files: ["src/a.py"], symbols: [], lines: [], versions: [], commands: [] } }),
  verdict: "insufficient_evidence",
  confidence: "low",
  evidence: [],
  missing: [],
  needsHumanReview: true,
  ...o,
});
const withProvided = (evidenceProvided: ClaimAssessment["claim"]["evidenceProvided"], refs = true) =>
  makeClaim({
    id: "c",
    type: "behavior",
    evidenceProvided,
    references: { files: refs ? ["src/a.py"] : [], symbols: [], lines: [], versions: [], commands: [] },
  });

describe("bestGuess rules, in order", () => {
  it("keeps a committed label", () => {
    expect(bestGuess("invalid", true, [])).toEqual({ label: "invalid", rule: "Same as the committed label." });
  });

  it("follows executed evidence first", () => {
    expect(bestGuess("needs-human-review", true, [assessed({ verdict: "reproduced", evidence: [ev("executed_repro")] })]).label).toBe("confirmed");
    expect(bestGuess("needs-info", true, [assessed({ verdict: "not_reproduced", evidence: [ev("executed_repro")] })]).label).toBe("cannot-reproduce");
  });

  it("calls a report that names non-existent code invalid", () => {
    expect(bestGuess("needs-human-review", true, [assessed({ verdict: "contradicted", evidence: [ev("static_proof")] })]).label).toBe("invalid");
  });

  it("calls a report with no technical detail invalid, ignoring environment context and screenshots", () => {
    const vague = assessed({ claim: withProvided(["screenshot"], false) });
    const context = assessed({ claim: makeClaim({ id: "v", type: "version" }), missing: [CONTEXT_ONLY] });
    expect(bestGuess("needs-info", true, [vague, context]).label).toBe("invalid");
    expect(bestGuess("needs-human-review", false, []).label).toBe("invalid");
  });

  it("does not count a UI action filed under commands as a code reference", () => {
    const keypress = assessed({
      claim: makeClaim({
        id: "k",
        type: "behavior",
        evidenceProvided: ["none"],
        references: { files: [], symbols: [], lines: [], versions: [], commands: ["CTRL+Space"] },
      }),
    });
    expect(bestGuess("needs-info", true, [keypress]).label).toBe("invalid");
  });

  it("treats a stack trace that does not match the code as another version or setup", () => {
    const drift = assessed({
      claim: withProvided(["stack_trace"]),
      evidence: [ev("static_proof", "stack-trace", "Frame `a.py:9` in `f` does not line up: the file has only 3 lines.")],
    });
    expect(bestGuess("needs-info", true, [drift]).label).toBe("cannot-reproduce");
  });

  it("leans confirmed when the report gives a trace or steps and the named code exists", () => {
    expect(bestGuess("needs-info", true, [assessed({ claim: withProvided(["repro_steps"]), evidence: [ev("static_proof")] })]).label).toBe("confirmed");
    expect(bestGuess("needs-info", true, [assessed({ claim: withProvided(["stack_trace"]), evidence: [ev("static_proof", "stack-trace")] })]).label).toBe("confirmed");
  });

  it("falls back to cannot-reproduce when claims are specific but nothing could be checked", () => {
    expect(bestGuess("needs-info", true, [assessed({ claim: withProvided(["logs"]), evidence: [] })]).label).toBe("cannot-reproduce");
  });
});

describe("best guess in the Markdown report", () => {
  const base = {
    target: { owner: "a", repo: "b", number: 1, kind: "issue", url: "https://github.com/a/b/issues/1", title: "t", commit: null },
    generatedAt: "2026-11-01T00:00:00.000Z",
    models: [],
    extraction: { status: "ok", claimCount: 0 },
    assessments: [],
  };

  it("shows the guess only when the committed label abstained", () => {
    const abstained = ReportSchema.parse({
      ...base,
      triage: { label: "needs-info", rationale: "r", bestGuess: { label: "cannot-reproduce", rule: "No trace or steps." } },
    });
    expect(renderReportMarkdown(abstained)).toContain("**Best guess if a label must be chosen:** Could not reproduce: No trace or steps.");
    const committed = ReportSchema.parse({ ...base, triage: { label: "invalid", rationale: "r", bestGuess: { label: "invalid", rule: "Same" } } });
    expect(renderReportMarkdown(committed)).not.toContain("Best guess");
  });
});
