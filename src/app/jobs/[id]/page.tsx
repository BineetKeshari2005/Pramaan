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
  verdictLabel,
  verdictTone,
} from "../../lib/present";
import type { JobStatusResponse } from "../../lib/api";
import type { Report } from "../../../core/types";
import sampleData from "../../../../tests/fixtures/reports/sample-report.json";

// ---------- Helpers ----------

const MAX_POLL_FAILURES = 5;

const STEPS = [
  { stage: "fetch", name: "Fetch" },
  { stage: "extract", name: "Read claims" },
  { stage: "checkout", name: "Check out" },
  { stage: "verify", name: "Verify" },
  { stage: "grade", name: "Grade" },
] as const;

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
        <p className="status-kind">
          {target.kind === "pull" ? "Pull request" : "Issue"} analysis
        </p>
        <h1>
          <a href={ghUrl} target="_blank" rel="noopener noreferrer">
            {target.owner}/{target.repo}#{target.number}
          </a>
        </h1>
        {report?.target.title && <p className="status-title">{report.target.title}</p>}
        <div className="status-meta">
          <span className={statusChipClass}>{status}</span>
          {commitStr && (
            <span>
              at commit <code className="commit-chip">{commitStr}</code>
            </span>
          )}
        </div>
        {isSample && (
          <p className="preview-note">Preview mode: this is a saved sample report, not a live run.</p>
        )}
      </div>

      {/* ---- Live progress (queued / running) ---- */}
      {(status === "queued" || status === "running") && (
        <section className="progress-card" aria-live="polite" aria-label="Analysis progress">
          <h2>{status === "queued" ? "Waiting to start" : "Analysing"}</h2>
          {status === "queued" && job.queuePosition !== undefined && (
            <p className="progress-now">Queue position: {job.queuePosition}</p>
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
                      ? `Verifying claim ${(ev.claimIndex ?? 0) + 1} of ${ev.claimCount ?? "?"}: ${ev.message}`
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
          <h2>Analysis failed</h2>
          <div className="error-banner" role="alert">
            {job.error ?? "An unknown error occurred."}
          </div>
          <a href="/">← Start a new analysis</a>
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
                <p className="triage-rationale">{report.triage.rationale}</p>
                {report.triage.bestGuess && report.triage.bestGuess.label !== report.triage.label && (
                  <p className="triage-guess">
                    <strong>Best guess if a label must be chosen:</strong>{" "}
                    {triageLabelText(report.triage.bestGuess.label)}: {report.triage.bestGuess.rule}{" "}
                    <em>(a guess from fixed evidence rules, not a verdict)</em>
                  </p>
                )}
                <p className="triage-disclaimer">
                  Suggested label only — Pramaan never closes issues.
                </p>
              </div>
            </section>

            {/* b) Summary chips */}
            <div className="summary-chips" aria-label="Verdict summary">
              {summary.byVerdict.reproduced > 0 && (
                <span className="verdict-chip confirmed">
                  ✓ {summary.byVerdict.reproduced} {verdictLabel("reproduced")}
                </span>
              )}
              {summary.byVerdict.contradicted > 0 && (
                <span className="verdict-chip refuted">
                  ✗ {summary.byVerdict.contradicted} {verdictLabel("contradicted")}
                </span>
              )}
              {summary.byVerdict.not_reproduced > 0 && (
                <span className="verdict-chip warning">
                  ? {summary.byVerdict.not_reproduced} {verdictLabel("not_reproduced")}
                </span>
              )}
              {summary.insufficientSupported > 0 && (
                <span className="verdict-chip unknown">
                  – {summary.insufficientSupported} Unverified, consistent with the code
                </span>
              )}
              {summary.insufficientUnverifiable > 0 && (
                <span className="verdict-chip unknown">
                  – {summary.insufficientUnverifiable} Nothing verifiable
                </span>
              )}
              {summary.needsHumanReview > 0 && (
                <span className="verdict-chip human-review">
                  ⚠ {summary.needsHumanReview} need{summary.needsHumanReview === 1 ? "s" : ""} human
                  review
                </span>
              )}
            </div>

            {/* c) Abstain notice */}
            {report.extraction.status === "abstained" && (
              <div className="abstain-notice" role="alert">
                <strong>Extraction abstained:</strong> {report.extraction.reason}
                <br />
                <span>A human should read the full report to assess the claims manually.</span>
              </div>
            )}

            {/* d) Claim cards */}
            <section aria-labelledby="claims-heading">
              <h2 id="claims-heading" className="claims-heading">
                Claims checked ({summary.total})
              </h2>
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
                Analyse another
              </a>
            </div>

            {/* f) Footer */}
            <footer className="report-footer">
              {report.models.length > 0 && <p>Models used: {report.models.join(", ")}</p>}
              <p>
                Generated at{" "}
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
