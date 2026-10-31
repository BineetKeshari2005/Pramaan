import type { ClaimAssessment, Confidence, EvidenceKind, Report, TriageLabel, Verdict } from "../../core/types";

// ---------- Label functions ----------

export function verdictLabel(verdict: Verdict): string {
  switch (verdict) {
    case "reproduced":
      return "Reproduced";
    case "contradicted":
      return "Contradicted";
    case "not_reproduced":
      return "Not reproduced";
    case "insufficient_evidence":
      return "Insufficient evidence";
  }
}

/** Returns a CSS-friendly tone class name. */
export function verdictTone(verdict: Verdict): "confirmed" | "refuted" | "warning" | "unknown" {
  switch (verdict) {
    case "reproduced":
      return "confirmed";
    case "contradicted":
      return "refuted";
    case "not_reproduced":
      return "warning";
    case "insufficient_evidence":
      return "unknown";
  }
}

export function confidenceLabel(confidence: Confidence): string {
  switch (confidence) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    case "low":
      return "Low confidence";
    case "none":
      return "No confidence";
  }
}

export function triageLabelText(label: TriageLabel): string {
  switch (label) {
    case "confirmed":
      return "Confirmed";
    case "invalid":
      return "Likely invalid";
    case "cannot-reproduce":
      return "Could not reproduce";
    case "needs-info":
      return "Needs more information";
    case "needs-human-review":
      return "Needs human review";
  }
}

export function evidenceKindLabel(kind: EvidenceKind): string {
  switch (kind) {
    case "executed_repro":
      return "Executed reproduction";
    case "failing_test":
      return "Failing test";
    case "static_proof":
      return "Static code check";
    case "doc_contradiction":
      return "Documentation";
    case "plausible_text":
      return "Text only";
    case "none":
      return "No evidence";
  }
}

export function stageLabel(stage: "fetch" | "extract" | "checkout" | "verify" | "grade" | "done"): string {
  switch (stage) {
    case "fetch":
      return "Fetching issue / PR";
    case "extract":
      return "Extracting claims";
    case "checkout":
      return "Checking out repository";
    case "verify":
      return "Verifying claims";
    case "grade":
      return "Grading evidence";
    case "done":
      return "Done";
  }
}

// ---------- Report summary ----------

export interface ReportSummary {
  total: number;
  byVerdict: Record<Verdict, number>;
  needsHumanReview: number;
}

export function summarizeReport(report: Report): ReportSummary {
  const byVerdict: Record<Verdict, number> = {
    reproduced: 0,
    contradicted: 0,
    not_reproduced: 0,
    insufficient_evidence: 0,
  };
  let needsHumanReview = 0;

  for (const a of report.assessments) {
    byVerdict[a.verdict]++;
    if (a.needsHumanReview) needsHumanReview++;
  }

  return { total: report.assessments.length, byVerdict, needsHumanReview };
}

// ---------- Sort assessments ----------

const VERDICT_ORDER: Record<Verdict, number> = {
  // needsHumanReview bucket comes before verdict ordering
  reproduced: 1,
  contradicted: 2,
  not_reproduced: 3,
  insufficient_evidence: 4,
};

export function sortAssessments(assessments: ClaimAssessment[]): ClaimAssessment[] {
  return [...assessments].sort((a, b) => {
    const aHuman = a.needsHumanReview ? 0 : 1;
    const bHuman = b.needsHumanReview ? 0 : 1;
    if (aHuman !== bHuman) return aHuman - bHuman;
    return VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict];
  });
}
