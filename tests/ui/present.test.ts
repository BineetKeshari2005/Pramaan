import { describe, expect, it } from "vitest";
import {
  claimTypeLabel,
  confidenceLabel,
  evidenceKindLabel,
  sortAssessments,
  stageLabel,
  summarizeReport,
  triageLabelText,
  triageMeaning,
  verdictLabel,
  verdictTone,
} from "../../src/app/lib/present";
import { CLAIM_TYPES, type ClaimAssessment, type Report, TRIAGE_LABELS } from "../../src/core/types";

// ---------- verdictLabel ----------

describe("verdictLabel", () => {
  it("maps reproduced", () => expect(verdictLabel("reproduced")).toBe("Verified"));
  it("maps contradicted", () => expect(verdictLabel("contradicted")).toBe("Proven false"));
  it("maps not_reproduced", () => expect(verdictLabel("not_reproduced")).toBe("Couldn't reproduce"));
  it("maps insufficient_evidence", () =>
    expect(verdictLabel("insufficient_evidence")).toBe("Not verified"));
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
  it("high", () => expect(confidenceLabel("high")).toBe("Strong proof"));
  it("medium", () => expect(confidenceLabel("medium")).toBe("Good proof"));
  it("low", () => expect(confidenceLabel("low")).toBe("Weak proof"));
  it("none", () => expect(confidenceLabel("none")).toBe("No proof"));
  it("describes unsettled claims by how much evidence was found", () => {
    expect(confidenceLabel("low", "insufficient_evidence")).toBe("Code agrees, not proven");
    expect(confidenceLabel("none", "insufficient_evidence")).toBe("Nothing to check");
    expect(confidenceLabel("medium", "contradicted")).toBe("Good proof");
  });
});

// ---------- triageLabelText ----------

describe("triageLabelText", () => {
  it("confirmed", () => expect(triageLabelText("confirmed")).toBe("Confirmed"));
  it("invalid", () => expect(triageLabelText("invalid")).toBe("Likely not valid"));
  it("cannot-reproduce", () =>
    expect(triageLabelText("cannot-reproduce")).toBe("Couldn't reproduce"));
  it("needs-info", () => expect(triageLabelText("needs-info")).toBe("Needs more info"));
  it("needs-human-review", () =>
    expect(triageLabelText("needs-human-review")).toBe("Needs your review"));
});

// ---------- triageMeaning / claimTypeLabel ----------

describe("triageMeaning", () => {
  it("explains every label for issues and pull requests in one sentence", () => {
    for (const label of TRIAGE_LABELS) {
      for (const kind of ["issue", "pull"] as const) {
        expect(triageMeaning(label, kind).length).toBeGreaterThan(20);
      }
    }
    expect(triageMeaning("confirmed", "pull")).toContain("pull request");
    expect(triageMeaning("needs-info", "issue")).toContain("Ask for exact steps");
  });
});

describe("claimTypeLabel", () => {
  it("names every claim type", () => {
    for (const type of CLAIM_TYPES) expect(claimTypeLabel(type)).not.toBe("");
    expect(claimTypeLabel("pr_claim")).toBe("What the PR says");
  });
});

// ---------- evidenceKindLabel ----------

describe("evidenceKindLabel", () => {
  it("executed_repro", () => expect(evidenceKindLabel("executed_repro")).toBe("Ran the code"));
  it("failing_test", () => expect(evidenceKindLabel("failing_test")).toBe("Ran the tests"));
  it("static_proof", () => expect(evidenceKindLabel("static_proof")).toBe("Checked the code"));
  it("doc_contradiction", () =>
    expect(evidenceKindLabel("doc_contradiction")).toBe("Checked the docs"));
  it("plausible_text", () => expect(evidenceKindLabel("plausible_text")).toBe("Report text only"));
  it("none", () => expect(evidenceKindLabel("none")).toBe("Nothing found"));
});

// ---------- stageLabel ----------

describe("stageLabel", () => {
  it("fetch", () => expect(stageLabel("fetch")).toBe("Reading from GitHub"));
  it("extract", () => expect(stageLabel("extract")).toBe("Finding the claims"));
  it("checkout", () => expect(stageLabel("checkout")).toBe("Downloading the code"));
  it("verify", () => expect(stageLabel("verify")).toBe("Checking each claim"));
  it("grade", () => expect(stageLabel("grade")).toBe("Scoring the results"));
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
