"use client";

import type { Report } from "../../core/types";
import {
  sortAssessments,
  summarizeReport,
  triageLabelText,
  triageMeaning,
  verdictLabel,
} from "../lib/present";
import ClaimCard from "./ClaimCard";
import CopyCommentButton from "./CopyCommentButton";
import SharePanel from "./SharePanel";

interface ReportViewProps {
  report: Report;
  /** Show the "Check another link" button (the single-report page does; the queue viewer does not). */
  showNewLink?: boolean;
}

/** A finished report: suggested label, counts, claim cards, sharing and downloads. */
export default function ReportView({ report, showNewLink = false }: ReportViewProps) {
  const { target } = report;
  const thing = target.kind === "pull" ? "pull request" : "issue";
  const summary = summarizeReport(report);
  const sorted = sortAssessments(report.assessments);
  const triageClass = report.triage.label.replace(/[^a-z-]/g, "");

  function downloadReport() {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pramaan-${target.owner}-${target.repo}-${target.number}.json`;
    a.click();
    // Revoking synchronously can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <>
      <section aria-labelledby="triage-heading">
        <div className={`triage-banner ${triageClass}`}>
          <p className="triage-eyebrow">Suggested label</p>
          <h2 id="triage-heading">{triageLabelText(report.triage.label)}</h2>
          <p className="triage-meaning">{triageMeaning(report.triage.label, target.kind)}</p>
          <p className="triage-rationale">
            <strong>Why:</strong> {report.triage.rationale}
          </p>
          {report.triage.bestGuess && report.triage.bestGuess.label !== report.triage.label && (
            <p className="triage-guess">
              <strong>If you have to pick a label:</strong> {triageLabelText(report.triage.bestGuess.label)}.{" "}
              {report.triage.bestGuess.rule} <em>This is a best guess, not proof.</em>
            </p>
          )}
          <div className="triage-footer">
            <p className="triage-disclaimer">Only a suggestion. Pramaan never closes anything.</p>
            <CopyCommentButton report={report} />
          </div>
        </div>
      </section>

      <div className="stat-strip" aria-label="Summary">
        <div className="stat-cell">
          <span className="stat-cell-label">Claims found</span>
          <span className="stat-cell-value">{summary.total}</span>
          <span className="stat-cell-note">in this {thing}</span>
        </div>
        <div className="stat-cell">
          <span className="stat-cell-label">{verdictLabel("reproduced")}</span>
          <span className="stat-cell-value">{summary.byVerdict.reproduced}</span>
          <span className="stat-cell-note">
            <span className="tag confirmed">code proves it</span>
          </span>
        </div>
        <div className="stat-cell">
          <span className="stat-cell-label">{verdictLabel("contradicted")}</span>
          <span className="stat-cell-value">{summary.byVerdict.contradicted}</span>
          <span className="stat-cell-note">
            <span className="tag refuted">code disagrees</span>
          </span>
        </div>
        {summary.byVerdict.not_reproduced > 0 && (
          <div className="stat-cell">
            <span className="stat-cell-label">{verdictLabel("not_reproduced")}</span>
            <span className="stat-cell-value">{summary.byVerdict.not_reproduced}</span>
            <span className="stat-cell-note">
              <span className="tag warning">didn&apos;t show up</span>
            </span>
          </div>
        )}
        <div className="stat-cell">
          <span className="stat-cell-label">{verdictLabel("insufficient_evidence")}</span>
          <span className="stat-cell-value">{summary.byVerdict.insufficient_evidence}</span>
          <span className="stat-cell-note">
            {summary.insufficientSupported} code agrees · {summary.insufficientUnverifiable} nothing to check
          </span>
        </div>
      </div>
      {summary.needsHumanReview > 0 && (
        <p className="review-callout">
          <strong>
            {summary.needsHumanReview} claim{summary.needsHumanReview === 1 ? " needs" : "s need"} your review.
          </strong>{" "}
          {summary.needsHumanReview === 1 ? "It is" : "They are"} marked below and listed first.
        </p>
      )}

      {report.extraction.status === "abstained" && (
        <div className="abstain-notice" role="alert">
          <strong>Pramaan could not read the claims in this report:</strong> {report.extraction.reason}
          <br />
          <span>Please read it yourself to judge it.</span>
        </div>
      )}

      <section aria-labelledby="claims-heading">
        <h2 id="claims-heading" className="claims-heading">
          Claim by claim
        </h2>
        <p className="claims-sub">Everything the {thing} says, and what the code shows for each.</p>
        {sorted.map((assessment, i) => (
          <ClaimCard key={assessment.claim.id} assessment={assessment} index={i} />
        ))}
      </section>

      <SharePanel report={report} />

      <div className="actions-row">
        <button className="btn btn-secondary" onClick={downloadReport} type="button">
          ↓ Download JSON
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => void navigator.clipboard.writeText(JSON.stringify(report, null, 2))}
          type="button"
        >
          ⎘ Copy JSON
        </button>
        {showNewLink && (
          <a href="/#analyse" className="btn btn-secondary">
            Check another link
          </a>
        )}
      </div>

      <footer className="report-footer">
        {report.models.length > 0 && <p>AI model used to read the report: {report.models.join(", ")}</p>}
        <p>
          Checked on{" "}
          <time dateTime={report.generatedAt}>{new Date(report.generatedAt).toLocaleString()}</time>
        </p>
      </footer>
    </>
  );
}
