import { describe, expect, it } from "vitest";
import {
  confidenceLabel,
  evidenceKindLabel,
  sortAssessments,
  stageLabel,
  summarizeReport,
  triageLabelText,
  verdictLabel,
  verdictTone,
} from "../../src/app/lib/present";
import type { ClaimAssessment, Report } from "../../src/core/types";

// ---------- verdictLabel ----------

describe("verdictLabel", () => {
  it("maps reproduced", () => expect(verdictLabel("reproduced")).toBe("Reproduced"));
  it("maps contradicted", () => expect(verdictLabel("contradicted")).toBe("Contradicted"));
  it("maps not_reproduced", () => expect(verdictLabel("not_reproduced")).toBe("Not reproduced"));
  it("maps insufficient_evidence", () =>
    expect(verdictLabel("insufficient_evidence")).toBe("Insufficient evidence"));
});

// ---------- verdictTone ----------

describe("verdictTone", () => {
  it("reproduced → confirmed", () => expect(verdictTone("reproduced")).toBe("confirmed"));
  it("contradicted → refuted", () => expect(verdictTone("contradicted")).toBe("refuted"));
  it("not_reproduced → warning", () => expect(verdictTone("not_reproduced")).toBe("warning"));
  it("insufficient_evidence → unknown", () =>
    expect(verdictTone("insufficient_evidence")).toBe("unknown"));
});

// ---------- confidenceLabel ----------

describe("confidenceLabel", () => {
  it("high", () => expect(confidenceLabel("high")).toBe("High confidence"));
  it("medium", () => expect(confidenceLabel("medium")).toBe("Medium confidence"));
  it("low", () => expect(confidenceLabel("low")).toBe("Low confidence"));
  it("none", () => expect(confidenceLabel("none")).toBe("No confidence"));
  it("describes unsettled claims by how much evidence was found", () => {
    expect(confidenceLabel("low", "insufficient_evidence")).toBe("Partial evidence");
    expect(confidenceLabel("none", "insufficient_evidence")).toBe("Nothing verifiable yet");
    expect(confidenceLabel("medium", "contradicted")).toBe("Medium confidence");
  });
});

// ---------- triageLabelText ----------

describe("triageLabelText", () => {
  it("confirmed", () => expect(triageLabelText("confirmed")).toBe("Confirmed"));
  it("invalid", () => expect(triageLabelText("invalid")).toBe("Likely invalid"));
  it("cannot-reproduce", () =>
    expect(triageLabelText("cannot-reproduce")).toBe("Could not reproduce"));
  it("needs-info", () => expect(triageLabelText("needs-info")).toBe("Needs more information"));
  it("needs-human-review", () =>
    expect(triageLabelText("needs-human-review")).toBe("Needs human review"));
});

// ---------- evidenceKindLabel ----------

describe("evidenceKindLabel", () => {
  it("executed_repro", () =>
    expect(evidenceKindLabel("executed_repro")).toBe("Executed reproduction"));
  it("failing_test", () => expect(evidenceKindLabel("failing_test")).toBe("Failing test"));
  it("static_proof", () => expect(evidenceKindLabel("static_proof")).toBe("Static code check"));
  it("doc_contradiction", () =>
    expect(evidenceKindLabel("doc_contradiction")).toBe("Documentation"));
  it("plausible_text", () => expect(evidenceKindLabel("plausible_text")).toBe("Text only"));
  it("none", () => expect(evidenceKindLabel("none")).toBe("No evidence"));
});

// ---------- stageLabel ----------

describe("stageLabel", () => {
  it("fetch", () => expect(stageLabel("fetch")).toBe("Fetching issue / PR"));
  it("extract", () => expect(stageLabel("extract")).toBe("Extracting claims"));
  it("checkout", () => expect(stageLabel("checkout")).toBe("Checking out repository"));
  it("verify", () => expect(stageLabel("verify")).toBe("Verifying claims"));
  it("grade", () => expect(stageLabel("grade")).toBe("Grading evidence"));
  it("done", () => expect(stageLabel("done")).toBe("Done"));
});

// ---------- Helper to build minimal assessments ----------

function makeAssessment(
  id: string,
  verdict: ClaimAssessment["verdict"],
  needsHumanReview: boolean,
  confidence: ClaimAssessment["confidence"] = "high",
): ClaimAssessment {
  return {
    claim: {
      id,
      type: "behavior",
      statement: `Statement for ${id}`,
      quote: "",
      references: { files: [], symbols: [], lines: [], versions: [], commands: [] },
      evidenceProvided: [],
    },
    verdict,
    confidence,
    evidence: [],
    missing: [],
    needsHumanReview,
  };
}

// ---------- summarizeReport ----------

describe("summarizeReport", () => {
  const report: Report = {
    target: {
      owner: "o",
      repo: "r",
      number: 1,
      kind: "issue",
      url: "https://github.com/o/r/issues/1",
      title: "T",
      commit: null,
    },
    generatedAt: "2026-01-01T00:00:00.000Z",
    models: [],
    extraction: { status: "ok", claimCount: 4 },
    assessments: [
      makeAssessment("a1", "reproduced", false),
      makeAssessment("a2", "contradicted", false),
      makeAssessment("a3", "not_reproduced", false),
      makeAssessment("a4", "insufficient_evidence", true),
    ],
    triage: { label: "needs-human-review", rationale: "r" },
  };

  it("totals correctly", () => {
    const s = summarizeReport(report);
    expect(s.total).toBe(4);
  });

  it("counts each verdict", () => {
    const s = summarizeReport(report);
    expect(s.byVerdict.reproduced).toBe(1);
    expect(s.byVerdict.contradicted).toBe(1);
    expect(s.byVerdict.not_reproduced).toBe(1);
    expect(s.byVerdict.insufficient_evidence).toBe(1);
  });

  it("counts needsHumanReview", () => {
    const s = summarizeReport(report);
    expect(s.needsHumanReview).toBe(1);
  });

  it("splits insufficient evidence into supported and unverifiable", () => {
    const s = summarizeReport({
      ...report,
      assessments: [
        makeAssessment("a1", "insufficient_evidence", false, "low"),
        makeAssessment("a2", "insufficient_evidence", true, "none"),
        makeAssessment("a3", "reproduced", false),
      ],
    });
    expect(s.insufficientSupported).toBe(1);
    expect(s.insufficientUnverifiable).toBe(1);
  });
});

// ---------- sortAssessments ----------

describe("sortAssessments", () => {
  it("puts needsHumanReview first regardless of verdict", () => {
    const assessments = [
      makeAssessment("a1", "reproduced", false),
      makeAssessment("a2", "insufficient_evidence", true),
      makeAssessment("a3", "contradicted", false),
      makeAssessment("a4", "not_reproduced", true),
    ];
    const sorted = sortAssessments(assessments);
    expect(sorted[0]!.needsHumanReview).toBe(true);
    expect(sorted[1]!.needsHumanReview).toBe(true);
    expect(sorted[2]!.needsHumanReview).toBe(false);
    expect(sorted[3]!.needsHumanReview).toBe(false);
  });

  it("within non-human-review group: contradicted before reproduced before not_reproduced before insufficient_evidence", () => {
    const assessments = [
      makeAssessment("a1", "insufficient_evidence", false),
      makeAssessment("a2", "not_reproduced", false),
      makeAssessment("a3", "reproduced", false),
      makeAssessment("a4", "contradicted", false),
    ];
    const sorted = sortAssessments(assessments);
    const ids = sorted.map((a) => a.claim.id);
    expect(ids).toEqual(["a4", "a3", "a2", "a1"]);
  });

  it("does not mutate the original array", () => {
    const assessments = [
      makeAssessment("x1", "reproduced", false),
      makeAssessment("x2", "contradicted", true),
    ];
    const original = [...assessments];
    sortAssessments(assessments);
    expect(assessments[0]!.claim.id).toBe(original[0]!.claim.id);
  });

  it("preserves original order within same bucket", () => {
    const assessments = [
      makeAssessment("first", "reproduced", false),
      makeAssessment("second", "reproduced", false),
    ];
    const sorted = sortAssessments(assessments);
    expect(sorted[0]!.claim.id).toBe("first");
    expect(sorted[1]!.claim.id).toBe("second");
  });
});
