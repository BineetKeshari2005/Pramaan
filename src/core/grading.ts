import type {
  Claim,
  ClaimAssessment,
  Confidence,
  Evidence,
  EvidenceKind,
  ExtractionResult,
  TriageLabel,
  VerificationResult,
} from "./types";

// Confidence comes only from the type of evidence, never from asking a model.
const STRENGTH: Record<EvidenceKind, number> = {
  executed_repro: 3,
  failing_test: 3,
  static_proof: 2,
  doc_contradiction: 2,
  plausible_text: 1,
  none: 0,
};

const CONFIDENCE_BY_STRENGTH: Confidence[] = ["none", "low", "medium", "high"];

export function strength(evidence: Evidence[]): number {
  return Math.max(0, ...evidence.map((e) => STRENGTH[e.kind]));
}

export function confidenceFor(evidence: Evidence[]): Confidence {
  return CONFIDENCE_BY_STRENGTH[strength(evidence)] ?? "none";
}

export function assessClaim(claim: Claim, results: VerificationResult[]): ClaimAssessment {
  const decisive = results.filter((r) => r.verdict !== "insufficient_evidence");
  const missing = [...new Set(results.flatMap((r) => r.missing))];
  const allEvidence = results.flatMap((r) => r.evidence);

  if (decisive.length === 0) {
    // No verdict, but code checks may still have found supporting facts (the referenced code exists,
    // the stack trace lines up). That is partial evidence: "low", never more, because nothing ran.
    const supported = strength(allEvidence) >= STRENGTH.static_proof;
    const context = claim.type === "version" && allEvidence.length === 0;
    return {
      claim,
      verdict: "insufficient_evidence",
      confidence: supported ? "low" : "none",
      evidence: allEvidence,
      missing:
        missing.length > 0
          ? missing
          : [context ? CONTEXT_ONLY : "No check could test this claim automatically."],
      // Environment and version details are context, not a decision a maintainer must make.
      needsHumanReview: needsReview(claim, "insufficient_evidence") && !context,
    };
  }

  const verdicts = new Set(decisive.map((r) => r.verdict));
  if (verdicts.has("reproduced") && verdicts.has("contradicted")) {
    return {
      claim,
      verdict: "insufficient_evidence",
      confidence: "none",
      evidence: allEvidence,
      missing: ["Checks disagree: some evidence supports this claim and some contradicts it.", ...missing],
      needsHumanReview: true,
    };
  }

  const best = decisive.reduce((a, b) => (strength(b.evidence) > strength(a.evidence) ? b : a));
  const confidence = confidenceFor(best.evidence);
  return {
    claim,
    verdict: best.verdict,
    confidence,
    evidence: allEvidence,
    missing,
    needsHumanReview: confidence === "low" || confidence === "none" || needsReview(claim, best.verdict),
  };
}

export const CONTEXT_ONLY =
  "Recorded as context: environment and version details are not verified against the code.";

/** Claims a maintainer must look at even though the tool reached a (weak or no) verdict. */
function needsReview(claim: Claim, verdict: ClaimAssessment["verdict"]): boolean {
  // Wrongly dismissing a real security bug costs more than a human look.
  if (claim.type === "security_impact") return verdict !== "reproduced";
  // An unsettled behavior or PR claim is the heart of the report; a location claim either checks out or not.
  return verdict === "insufficient_evidence" && (claim.type === "behavior" || claim.type === "pr_claim");
}

const atLeastMedium = (a: ClaimAssessment) => a.confidence === "high" || a.confidence === "medium";

export function triage(
  extraction: ExtractionResult,
  assessments: ClaimAssessment[],
): { label: TriageLabel; rationale: string } {
  if (extraction.status === "abstained") {
    return { label: "needs-human-review", rationale: `Claim extraction abstained: ${extraction.reason}` };
  }
  if (assessments.length === 0) {
    return { label: "needs-info", rationale: "The report contains no specific technical claim to check." };
  }

  const reproduced = assessments.filter((a) => a.verdict === "reproduced" && a.confidence === "high");
  if (reproduced.length > 0) {
    return { label: "confirmed", rationale: `${reproduced.length} claim(s) reproduced by execution.` };
  }

  if (assessments.some((a) => a.claim.type === "security_impact" && a.needsHumanReview)) {
    return {
      label: "needs-human-review",
      rationale: "A security claim could not be settled automatically; a maintainer should look.",
    };
  }

  const decisive = assessments.filter((a) => a.verdict !== "insufficient_evidence");
  if (decisive.length > 0 && decisive.every((a) => a.verdict === "contradicted" && atLeastMedium(a))) {
    return {
      label: "invalid",
      rationale: `Every checkable claim (${decisive.length}) is contradicted by the code or docs.`,
    };
  }
  if (
    decisive.length > 0 &&
    decisive.every((a) => a.verdict !== "reproduced" && atLeastMedium(a)) &&
    decisive.some((a) => a.verdict === "not_reproduced")
  ) {
    return { label: "cannot-reproduce", rationale: "The described behavior did not occur when tested." };
  }

  return {
    label: "needs-info",
    rationale: "The evidence is not strong enough for a verdict; the report needs more detail.",
  };
}

export type BestGuessLabel = "invalid" | "cannot-reproduce" | "confirmed";

/**
 * The closest closed-issue label when forced to choose. Derived only from what a report already
 * contains, by fixed rules checked in order (set before evaluation, not tuned to results).
 * A committed triage label always wins; otherwise this is a lower-confidence guess.
 */
export function bestGuess(
  strict: TriageLabel,
  extractionOk: boolean,
  assessments: ClaimAssessment[],
): { label: BestGuessLabel; rule: string } {
  if (strict === "confirmed" || strict === "invalid" || strict === "cannot-reproduce") {
    return { label: strict, rule: "Same as the committed label." };
  }
  const evidence = assessments.flatMap((a) => a.evidence);
  const executed = (verdict: ClaimAssessment["verdict"]) =>
    assessments.some((a) => a.verdict === verdict && a.evidence.some((e) => e.kind === "executed_repro"));

  if (executed("reproduced")) {
    return { label: "confirmed", rule: "The reporter's code reproduced the problem when executed." };
  }
  if (executed("not_reproduced")) {
    return { label: "cannot-reproduce", rule: "The reporter's code ran without the problem." };
  }
  if (assessments.some((a) => a.verdict === "contradicted")) {
    return { label: "invalid", rule: "The report names code that does not exist at the checked commit." };
  }
  const substantive = assessments.filter((a) => !a.missing.includes(CONTEXT_ONLY));
  // Code references only: models also file UI actions such as "CTRL+Space" under commands, and real
  // shell commands the reporter ran are already counted as repro_steps by detectProvidedEvidence.
  const anyReference = substantive.some((a) => {
    const r = a.claim.references;
    return r.files.length + r.symbols.length + r.lines.length > 0;
  });
  const technical = new Set(substantive.flatMap((a) => a.claim.evidenceProvided).filter((e) => e !== "none" && e !== "screenshot"));
  if (!extractionOk || substantive.length === 0 || (!anyReference && technical.size === 0)) {
    return { label: "invalid", rule: "The report has no checkable technical detail: no code references, steps, logs or traces." };
  }
  if (evidence.some((e) => e.source === "stack-trace" && /does not line up/.test(e.summary))) {
    return { label: "cannot-reproduce", rule: "The stack trace does not match the code, so the report likely comes from another version or setup." };
  }
  const supported = evidence.some((e) => e.kind === "static_proof");
  if (supported && (technical.has("stack_trace") || technical.has("repro_steps"))) {
    return { label: "confirmed", rule: "The report gives a trace or steps, and the code it names exists at the checked commit." };
  }
  return { label: "cannot-reproduce", rule: "The claims could not be checked and the report gives no trace or steps to reproduce." };
}
