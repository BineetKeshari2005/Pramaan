"use client";

import type { JobStatusResponse } from "../lib/api";
import { stageLabel } from "../lib/present";

const STEPS = [
  { stage: "fetch", name: "Read GitHub" },
  { stage: "extract", name: "Find claims" },
  { stage: "checkout", name: "Get the code" },
  { stage: "verify", name: "Check claims" },
  { stage: "grade", name: "Score" },
] as const;

function stepState(current: number, i: number): string {
  if (i < current) return "step done";
  if (i === current) return "step active";
  return "step";
}

/** Live progress for a queued or running job: a five-step stepper above the event log. */
export default function JobProgress({ job }: { job: JobStatusResponse }) {
  const last = job.progress[job.progress.length - 1];
  const current = last ? STEPS.findIndex((s) => s.stage === last.stage) : -1;

  return (
    <section className="progress-card" aria-live="polite" aria-label="Progress">
      <h2>{job.status === "queued" ? "Waiting for the previous check to finish" : "Checking…"}</h2>
      {job.status === "queued" && job.queuePosition !== undefined && (
        <p className="progress-now">Place in line: {job.queuePosition}</p>
      )}
      <ol className="stepper">
        {STEPS.map((s, i) => (
          <li key={s.stage} className={stepState(current, i)}>
            <span className="step-dot" />
            <span className="step-name">{s.name}</span>
          </li>
        ))}
      </ol>
      {job.progress.length > 0 && (
        <ul className="progress-list">
          {job.progress.map((ev, i) => {
            const isVerify = ev.stage === "verify" && ev.claimIndex !== undefined && ev.claimCount !== undefined;
            return (
              <li key={i}>
                <span className="stage-label">{stageLabel(ev.stage)}</span>
                <span>
                  {isVerify ? `Claim ${(ev.claimIndex ?? 0) + 1} of ${ev.claimCount ?? "?"}: ${ev.message}` : ev.message}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
