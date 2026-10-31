import { CONTEXT_ONLY } from "../grading";
import type { ClaimAssessment, Report } from "../types";

/** Environment and version details recorded as context: never something to ask the reporter about. */
const isContext = (a: ClaimAssessment) => a.missing.includes(CONTEXT_ONLY);

export function buildReporterReply(report: Report): string | null {
  // Returns null when there is nothing to ask: the label is "confirmed" or "invalid" and no claim needs more information.
  const isConfirmedOrInvalid =
    report.triage.label === "confirmed" || report.triage.label === "invalid";
  const open = report.assessments.filter((a) => !isContext(a));
  const hasMissingInfo = open.some(
    (a) => a.verdict === "insufficient_evidence" || a.missing.length > 0,
  );

  if (isConfirmedOrInvalid && !hasMissingInfo) {
    return null;
  }

  const partsBeforeDetails: string[] = [];

  // 1. Thank-you line
  partsBeforeDetails.push(
    "Thank you for opening this report! Pramaan ran automated checks against the codebase to help maintainers triage it.",
  );

  // 2. What could not be verified (one bullet per relevant claim with claim statement)
  const unverified = open.filter((a) => a.verdict !== "reproduced");
  if (unverified.length > 0) {
    const claimBullets = unverified.map((a) => `- ${a.claim.statement}`).join("\n");
    partsBeforeDetails.push(`The following could not be fully verified:\n${claimBullets}`);
  }

  // 3. Deduplicated numbered list of concrete requests derived from structured data
  const requests: string[] = [];

  // - Ask for the exact version only when the report gives none: asking again for what the reporter
  //   already wrote ("Running version: 1.10.10.18") reads as if nobody read the issue.
  const gaveVersion = report.assessments.some(
    (a) => a.claim.type === "version" || a.claim.references.versions.length > 0,
  );
  if (!gaveVersion) {
    requests.push("The exact version, release tag, or commit hash where you observed this behavior.");
  }

  // - If any behavior claim has no "repro_steps" in evidenceProvided: ask for minimal steps / code snippet
  const needsRepro = report.assessments.some(
    (a) => a.claim.type === "behavior" && !a.claim.evidenceProvided.includes("repro_steps"),
  );
  if (needsRepro) {
    requests.push("Minimal, step-by-step reproduction instructions or a self-contained code snippet.");
  }

  // - If any behavior claim mentions an error/exception (/error|exception|crash|traceback/i) and no "stack_trace"
  const needsStackTrace = report.assessments.some(
    (a) =>
      a.claim.type === "behavior" &&
      /error|exception|crash|traceback/i.test(a.claim.statement) &&
      !a.claim.evidenceProvided.includes("stack_trace"),
  );
  if (needsStackTrace) {
    requests.push("The complete error output or stack trace.");
  }

  // - If any assessment is "contradicted": point out code was not found at commit short SHA, ask about version/fork
  const hasContradicted = report.assessments.some((a) => a.verdict === "contradicted");
  if (hasContradicted) {
    const commitShort = report.target.commit ? report.target.commit.slice(0, 7) : "the checked commit";
    requests.push(
      `The referenced code was not found at commit ${commitShort}. Could you clarify if this report is about a different version, release, or fork?`,
    );
  }

  // - If extraction abstained: ask to restate problem as concrete steps, expected result, actual result
  if (report.extraction.status === "abstained") {
    requests.push(
      "Restate the problem with concrete steps, expected result, and actual result.",
    );
  }

  if (requests.length === 0 && hasMissingInfo) {
    requests.push("Any additional context or details to help us reproduce and verify this behavior.");
  }

  const uniqueRequests = Array.from(new Set(requests));
  if (uniqueRequests.length > 0) {
    const numberedList = uniqueRequests.map((r, i) => `${i + 1}. ${r}`).join("\n");
    partsBeforeDetails.push(
      `Could you please provide the following details to help us investigate?\n${numberedList}`,
    );
  }

  // Closing line
  partsBeforeDetails.push(
    "This reply was drafted by Pramaan, an automated evidence check; a maintainer will review the issue.",
  );

  const mainBody = partsBeforeDetails.join("\n\n");

  // 4. Details from automated check (deduplicated missing strings as plain bullets)
  const allMissing = Array.from(
    new Set(open.flatMap((a) => a.missing)),
  );
  let detailsSection = "";
  if (allMissing.length > 0) {
    detailsSection = `\n\nDetails from the automated check:\n${allMissing.map((m) => `- ${m}`).join("\n")}`;
  }

  return mainBody + detailsSection + "\n";
}
