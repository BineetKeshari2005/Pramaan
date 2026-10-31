"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import ClaimCard from "../../components/ClaimCard";
import SharePanel from "../../components/SharePanel";
import { getJobStatus } from "../../lib/api";
import {
  sortAssessments,
  stageLabel,
  summarizeReport,
  triageLabelText,
  triageMeaning,
  verdictLabel,
} from "../../lib/present";
import type { JobStatusResponse } from "../../lib/api";
import type { Report } from "../../../core/types";
import sampleData from "../../../../tests/fixtures/reports/sample-report.json";

// ---------- Helpers ----------

const MAX_POLL_FAILURES = 5;

const STEPS = [
  { stage: "fetch", name: "Read GitHub" },
  { stage: "extract", name: "Find claims" },
  { stage: "checkout", name: "Get the code" },
  { stage: "verify", name: "Check claims" },
  { stage: "grade", name: "Score" },
] as const;

const STATUS_TEXT: Record<JobStatusResponse["status"], string> = {
  queued: "Waiting",
  running: "Checking",
  done: "Finished",
  failed: "Failed",
};

function shortCommit(commit: string | null): string | null {
  return commit ? commit.slice(0, 7) : null;
}

function stepState(current: number, i: number): string {
  if (i < current) return "step done";
  if (i === current) return "step active";
  return "step";
}

// ---------- Sample report loader (preview mode) ----------

function loadSampleReport(): JobStatusResponse {
  const report = sampleData as Report;
  return {
    id: "sample",
    status: "done",
    createdAt: report.generatedAt,
    updatedAt: report.generatedAt,
    input: { targetUrl: report.target.url },
    target: {
      owner: report.target.owner,
      repo: report.target.repo,
      number: report.target.number,
      kind: report.target.kind,
    },
    progress: [{ stage: "done", message: "Sample report loaded" }],
    report,
  };
}

// ---------- Page ----------

export default function JobPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : (params.id?.[0] ?? "");
  const isSample = id === "sample";

  const [job, setJob] = useState<JobStatusResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failuresRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fetchJob = useCallback(async () => {
    try {
      let data: JobStatusResponse;
      if (isSample) {
        data = loadSampleReport();
      } else {
        data = await getJobStatus(id);
      }
      failuresRef.current = 0;
      setJob(data);
      if (data.status === "done" || data.status === "failed") {
        stopPolling();
      }
    } catch (err) {
      // A dropped request or a server restart mid-poll should not end the page; give up after ~7 s.
      failuresRef.current += 1;
      if (failuresRef.current >= MAX_POLL_FAILURES || isSample) {
        setLoadError(err instanceof Error ? err.message : "Failed to load job status.");
        stopPolling();
      }
    }
  }, [id, isSample, stopPolling]);

  useEffect(() => {
    void fetchJob();
    if (!isSample) {
      intervalRef.current = setInterval(() => {
        void fetchJob();
      }, 1500);
    }
    return () => stopPolling();
  }, [fetchJob, isSample, stopPolling]);

  // ---------- Loading state ----------
  if (loadError) {
    return (
      <main className="page-container">
        <div className="status-header">
          <h1>Could not load this analysis</h1>
          <div className="error-banner" role="alert">
            {loadError}
          </div>
          <a href="/">← Start a new analysis</a>
        </div>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="page-container">
        <div className="status-header">
          <p className="status-kind">Loading analysis…</p>
        </div>
      </main>
    );
  }

  const { target, status, report } = job;
  const ghUrl = `https://github.com/${target.owner}/${target.repo}/${target.kind === "pull" ? "pull" : "issues"}/${target.number}`;

  // ---------- Status header ----------
  const statusChipClass = `status-chip status-chip-${status}`;
  const commitStr = shortCommit(report?.target.commit ?? null);

  // ---------- Download / copy helpers ----------
  function downloadReport() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pramaan-${target.owner}-${target.repo}-${target.number}.json`;
    a.click();
    // Revoking synchronously can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyReport() {
    if (!report) return;
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
  }

  return (
    <main className="page-container">
      {/* ---- Header ---- */}
      <div className="status-header">
        <p className="status-kind">{target.kind === "pull" ? "Pull request" : "Issue"} check</p>
        <h1>
          <a href={ghUrl} target="_blank" rel="noopener noreferrer">
            {target.owner}/{target.repo}#{target.number}
          </a>
        </h1>
        {report?.target.title && <p className="status-title">{report.target.title}</p>}
        <div className="status-meta">
          <span className={statusChipClass}>{STATUS_TEXT[status]}</span>
          {commitStr && (
            <span>
              Code checked at <code className="commit-chip">{commitStr}</code>
            </span>
          )}
        </div>
        {isSample && <p className="preview-note">This is a saved sample report, not a live check.</p>}
      </div>

      {/* ---- Live progress (queued / running) ---- */}
      {(status === "queued" || status === "running") && (
        <section className="progress-card" aria-live="polite" aria-label="Analysis progress">
          <h2>{status === "queued" ? "Waiting for the previous check to finish" : "Checking…"}</h2>
          {status === "queued" && job.queuePosition !== undefined && (
            <p className="progress-now">Place in line: {job.queuePosition}</p>
          )}
          {(() => {
            const last = job.progress[job.progress.length - 1];
            const current = last ? STEPS.findIndex((s) => s.stage === last.stage) : -1;
            return (
              <ol className="stepper">
                {STEPS.map((s, i) => (
                  <li key={s.stage} className={stepState(current, i)}>
                    <span className="step-dot" />
                    <span className="step-name">{s.name}</span>
                  </li>
                ))}
              </ol>
            );
          })()}
          <ul className="progress-list">
            {job.progress.map((ev, i) => {
              const isVerify =
                ev.stage === "verify" &&
                ev.claimIndex !== undefined &&
                ev.claimCount !== undefined;
              return (
                <li key={i}>
                  <span className="stage-label">{stageLabel(ev.stage)}</span>
                  <span>
                    {isVerify
                      ? `Claim ${(ev.claimIndex ?? 0) + 1} of ${ev.claimCount ?? "?"}: ${ev.message}`
                      : ev.message}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ---- Failed state ---- */}
      {status === "failed" && (
        <section className="progress-card">
          <h2>The check could not finish</h2>
          <div className="error-banner" role="alert">
            {job.error ?? "An unknown error occurred."}
          </div>
          <a href="/#analyse">← Try another link</a>
        </section>
      )}

      {/* ---- Done state ---- */}
      {status === "done" && report && (() => {
        const summary = summarizeReport(report);
        const sorted = sortAssessments(report.assessments);
        const triageClass = report.triage.label.replace(/[^a-z-]/g, "");

        return (
          <>
            {/* a) Triage banner */}
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
                    <strong>If you have to pick a label:</strong>{" "}
                    {triageLabelText(report.triage.bestGuess.label)}. {report.triage.bestGuess.rule}{" "}
                    <em>This is a best guess, not proof.</em>
                  </p>
                )}
                <p className="triage-disclaimer">Only a suggestion. Pramaan never closes anything.</p>
              </div>
            </section>

            {/* b) At-a-glance numbers */}
            <div className="stat-strip" aria-label="Summary">
              <div className="stat-cell">
                <span className="stat-cell-label">Claims found</span>
                <span className="stat-cell-value">{summary.total}</span>
                <span className="stat-cell-note">
                  in this {target.kind === "pull" ? "pull request" : "issue"}
                </span>
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
                  {summary.insufficientSupported} code agrees · {summary.insufficientUnverifiable} nothing
                  to check
                </span>
              </div>
            </div>
            {summary.needsHumanReview > 0 && (
              <p className="review-callout">
                <strong>
                  {summary.needsHumanReview} claim{summary.needsHumanReview === 1 ? " needs" : "s need"} your
                  review.
                </strong>{" "}
                {summary.needsHumanReview === 1 ? "It is" : "They are"} marked below and listed first.
              </p>
            )}

            {/* c) Abstain notice */}
            {report.extraction.status === "abstained" && (
              <div className="abstain-notice" role="alert">
                <strong>Pramaan could not read the claims in this report:</strong> {report.extraction.reason}
                <br />
                <span>Please read it yourself to judge it.</span>
              </div>
            )}

            {/* d) Claim cards */}
            <section aria-labelledby="claims-heading">
              <h2 id="claims-heading" className="claims-heading">
                Claim by claim
              </h2>
              <p className="claims-sub">
                Everything the {target.kind === "pull" ? "pull request" : "issue"} says, and what the code
                shows for each.
              </p>
              {sorted.map((assessment, i) => (
                <ClaimCard key={assessment.claim.id} assessment={assessment} index={i} />
              ))}
            </section>

            {/* Share panel */}
            <SharePanel report={report} />

            {/* e) Download / copy */}
            <div className="actions-row">
              <button className="btn btn-secondary" onClick={downloadReport} type="button">
                ↓ Download JSON
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  void copyReport();
                }}
                type="button"
              >
                ⎘ Copy JSON
              </button>
              <a href="/#analyse" className="btn btn-secondary">
                Check another link
              </a>
            </div>

            {/* f) Footer */}
            <footer className="report-footer">
              {report.models.length > 0 && <p>AI model used to read the report: {report.models.join(", ")}</p>}
              <p>
                Checked on{" "}
                <time dateTime={report.generatedAt}>
                  {new Date(report.generatedAt).toLocaleString()}
                </time>
              </p>
            </footer>
          </>
        );
      })()}
    </main>
  );
}
