import type { Report } from "../../core/types";

// ---------- Job status types ----------

export type JobStatus = "queued" | "running" | "done" | "failed";

export interface ProgressEvent {
  stage: "fetch" | "extract" | "checkout" | "verify" | "grade" | "done";
  message: string;
  claimIndex?: number;
  claimCount?: number;
}

export interface AnalyzeBody {
  targetUrl: string;
  repoUrl?: string;
  commit?: string;
  buildCommand?: string;
  testCommand?: string;
  notes?: string;
}

export interface AnalyzeResponse {
  jobId: string;
  status: JobStatus;
}

export interface JobTarget {
  owner: string;
  repo: string;
  number: number;
  kind: "issue" | "pull";
}

export interface JobStatusResponse {
  id: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  input: AnalyzeBody;
  target: JobTarget;
  progress: ProgressEvent[];
  report?: Report;
  error?: string;
  queuePosition?: number;
}

// ---------- API functions ----------

export async function startAnalysis(body: AnalyzeBody): Promise<AnalyzeResponse> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Request failed with status ${res.status}`);
  }

  return res.json() as Promise<AnalyzeResponse>;
}

export async function getJobStatus(id: string): Promise<JobStatusResponse> {
  const res = await fetch(`/api/status/${id}`);

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Request failed with status ${res.status}`);
  }

  return res.json() as Promise<JobStatusResponse>;
}
