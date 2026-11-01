"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import JobProgress from "../../components/JobProgress";
import ReportView from "../../components/ReportView";
import { getJobStatus } from "../../lib/api";
import { jobStatusText } from "../../lib/present";
import type { JobStatusResponse } from "../../lib/api";
import type { Report } from "../../../core/types";
import sampleData from "../../../../tests/fixtures/reports/sample-report.json";

// ---------- Helpers ----------

const MAX_POLL_FAILURES = 5;

function shortCommit(commit: string | null): string | null {
  return commit ? commit.slice(0, 7) : null;
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
  const commitStr = shortCommit(report?.target.commit ?? null);

  return (
    <main className="page-container">
      <div className="status-header">
        <p className="status-kind">{target.kind === "pull" ? "Pull request" : "Issue"} check</p>
        <h1>
          <a href={ghUrl} target="_blank" rel="noopener noreferrer">
            {target.owner}/{target.repo}#{target.number}
          </a>
        </h1>
        {report?.target.title && <p className="status-title">{report.target.title}</p>}
        <div className="status-meta">
          <span className={`status-chip status-chip-${status}`}>{jobStatusText(status)}</span>
          {commitStr && (
            <span>
              Code checked at <code className="commit-chip">{commitStr}</code>
            </span>
          )}
        </div>
        {isSample && <p className="preview-note">This is a saved sample report, not a live check.</p>}
      </div>

      {(status === "queued" || status === "running") && <JobProgress job={job} />}

      {status === "failed" && (
        <section className="progress-card">
          <h2>The check could not finish</h2>
          <div className="error-banner" role="alert">
            {job.error ?? "An unknown error occurred."}
          </div>
          <a href="/#analyse">← Try another link</a>
        </section>
      )}

      {status === "done" && report && <ReportView report={report} showNewLink />}
    </main>
  );
}
