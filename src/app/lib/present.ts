import type {
  ClaimAssessment,
  ClaimType,
  Confidence,
  EvidenceKind,
  Report,
  TriageLabel,
  Verdict,
} from "../../core/types";

// ---------- Label functions ----------
// Everything here is shown to maintainers, so it uses plain words, not pipeline terms.

export function verdictLabel(verdict: Verdict): string {
  switch (verdict) {
    case "reproduced":
      return "Verified";
    case "contradicted":
      return "Proven false";
    case "not_reproduced":
      return "Couldn't reproduce";
    case "insufficient_evidence":
      return "Not verified";
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

export function confidenceLabel(confidence: Confidence, verdict?: Verdict): string {
  // A strength next to "Not verified" reads as a contradiction; say what was found instead.
  if (verdict === "insufficient_evidence") {
    return confidence === "none" ? "Nothing to check" : "Code agrees, not proven";
  }
  switch (confidence) {
    case "high":
      return "Strong proof";
    case "medium":
      return "Good proof";
    case "low":
      return "Weak proof";
    case "none":
      return "No proof";
  }
}

export function triageLabelText(label: TriageLabel): string {
  switch (label) {
    case "confirmed":
      return "Confirmed";
    case "invalid":
      return "Likely not valid";
    case "cannot-reproduce":
      return "Couldn't reproduce";
    case "needs-info":
      return "Needs more info";
    case "needs-human-review":
      return "Needs your review";
  }
}

/** One plain sentence telling a maintainer what the suggested label means for them. */
export function triageMeaning(label: TriageLabel, kind: "issue" | "pull"): string {
  const thing = kind === "pull" ? "pull request" : "issue";
  switch (label) {
    case "confirmed":
      return `The code backs up what this ${thing} says.`;
    case "invalid":
      return `The code contradicts this ${thing}. As written, it does not hold up.`;
    case "cannot-reproduce":
      return kind === "pull"
        ? "Pramaan ran the checks, and the result did not match what the pull request says."
        : "Pramaan tried it, and the problem did not show up.";
    case "needs-info":
      return kind === "pull"
        ? "The code neither proves nor disproves the main claims. Ask the author how to test the change."
        : "The code neither proves nor disproves this. Ask for exact steps, the error message or the version.";
    case "needs-human-review":
      return "Some claims need a person's judgement, such as how serious a security risk is.";
  }
}

export function claimTypeLabel(type: ClaimType): string {
  switch (type) {
    case "behavior":
      return "What happens";
    case "code_location":
      return "Where in the code";
    case "version":
      return "Version";
    case "security_impact":
      return "Security";
    case "pr_claim":
      return "What the PR says";
  }
}

export function evidenceKindLabel(kind: EvidenceKind): string {
  switch (kind) {
    case "executed_repro":
      return "Ran the code";
    case "failing_test":
      return "Ran the tests";
    case "static_proof":
      return "Checked the code";
    case "doc_contradiction":
      return "Checked the docs";
    case "plausible_text":
      return "Report text only";
    case "none":
      return "Nothing found";
  }
}

export function stageLabel(stage: "fetch" | "extract" | "checkout" | "verify" | "grade" | "done"): string {
  switch (stage) {
    case "fetch":
      return "Reading from GitHub";
    case "extract":
      return "Finding the claims";
    case "checkout":
      return "Downloading the code";
    case "verify":
      return "Checking each claim";
    case "grade":
      return "Scoring the results";
    case "done":
      return "Done";
  }
}

export function jobStatusText(status: "queued" | "running" | "done" | "failed"): string {
  switch (status) {
    case "queued":
      return "Waiting";
    case "running":
      return "Checking";
    case "done":
      return "Finished";
    case "failed":
      return "Failed";
  }
}

// ---------- Report summary ----------

export interface ReportSummary {
  total: number;
  byVerdict: Record<Verdict, number>;
  needsHumanReview: number;
  /** Unsettled claims whose references checked out against the code (partial evidence). */
  insufficientSupported: number;
  /** Unsettled claims with nothing verifiable at all. */
  insufficientUnverifiable: number;
}

export function summarizeReport(report: Report): ReportSummary {
  const byVerdict: Record<Verdict, number> = {
    reproduced: 0,
    contradicted: 0,
    not_reproduced: 0,
    insufficient_evidence: 0,
  };
  let needsHumanReview = 0;
  let insufficientSupported = 0;
  let insufficientUnverifiable = 0;

  for (const a of report.assessments) {
    byVerdict[a.verdict]++;
    if (a.needsHumanReview) needsHumanReview++;
    if (a.verdict === "insufficient_evidence") {
      if (a.confidence === "none") insufficientUnverifiable++;
      else insufficientSupported++;
    }
  }

  return { total: report.assessments.length, byVerdict, needsHumanReview, insufficientSupported, insufficientUnverifiable };
}

// ---------- Sort assessments ----------

const VERDICT_ORDER: Record<Verdict, number> = {
  // needsHumanReview bucket comes before verdict ordering
  contradicted: 1,
  reproduced: 2,
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
