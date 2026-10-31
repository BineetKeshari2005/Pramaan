import { evidenceLevelText, evidenceStrength } from "../../core/report";
import type { ClaimAssessment, Report, Verdict } from "../../core/types";
import type { JobStatus, JobStatusResponse } from "./api";

export const MIN_LINKS = 2;
export const MAX_LINKS = 10;

const LINK_RE = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/(issues|pull)\/(\d+)\/?$/;

export interface QueueLine {
  /** Position in the pasted list, from 0. */
  index: number;
  url: string;
  kind: "issue" | "pull" | null;
  label: string;
  /** Why this line will not be checked. */
  error?: string;
}

export interface ParsedQueue {
  lines: QueueLine[];
  valid: number;
  /** Set when the batch as a whole cannot start. */
  error?: string;
}

/** One link per line. Bad lines are reported one by one and never block the good ones. */
export function parseQueueInput(text: string): ParsedQueue {
  const raw = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const seen = new Map<string, number>();

  const lines: QueueLine[] = raw.map((input, index) => {
    const url = input.replace(/[?#].*$/, "").replace(/\/$/, "");
    const m = LINK_RE.exec(url);
    if (!m) {
      return { index, url: input, kind: null, label: input, error: "Not a GitHub issue or pull request link" };
    }
    const kind = m[3] === "pull" ? "pull" : "issue";
    const label = `${m[1]}/${m[2]}#${m[4]}`;
    const key = label.toLowerCase();
    const first = seen.get(key);
    if (first !== undefined) {
      return { index, url, kind, label, error: `Same as line ${first + 1}` };
    }
    seen.set(key, index);
    return { index, url, kind, label };
  });

  const valid = lines.filter((l) => !l.error).length;
  let error: string | undefined;
  if (raw.length < MIN_LINKS) error = `Paste at least ${MIN_LINKS} links, one per line.`;
  else if (raw.length > MAX_LINKS) error = `Paste at most ${MAX_LINKS} links; you have ${raw.length}.`;
  else if (valid === 0) error = "None of these lines is a GitHub issue or pull request link.";
  return { lines, valid, error };
}

// ---------- Ranking ----------

export type QueueState = JobStatus | "invalid";

export interface RankInput {
  index: number;
  state: QueueState;
  report?: Report;
}

/** The fields ranking reads, taken from a job's latest status. */
export function rankFieldsFromJob(job: JobStatusResponse): Pick<RankInput, "state" | "report"> {
  return { state: job.status, report: job.report };
}

export interface Headline {
  /** 0 reproduced, 1 contradicted, 2 not reproduced, 3 insufficient evidence, 4 failed, 5 not finished, 6 invalid. */
  bucket: number;
  verdict: Verdict | null;
  strength: number;
  /** Claims backed by a static check or an execution. */
  strongClaims: number;
  claim: ClaimAssessment | null;
}

const VERDICT_BUCKET: Record<Verdict, number> = {
  reproduced: 0,
  contradicted: 1,
  not_reproduced: 2,
  insufficient_evidence: 3,
};

/** An item is as actionable as its strongest claim. */
export function headline(item: RankInput): Headline {
  const empty = (bucket: number): Headline => ({ bucket, verdict: null, strength: 0, strongClaims: 0, claim: null });
  if (item.state === "invalid") return empty(6);
  if (item.state === "queued" || item.state === "running") return empty(5);
  if (item.state === "failed" || !item.report) return empty(4);

  const claims = item.report.assessments;
  const strongClaims = claims.filter((a) => evidenceStrength(a) >= 2).length;
  if (claims.length === 0) return { ...empty(3), strongClaims };

  const best = [...claims].sort(
    (a, b) => VERDICT_BUCKET[a.verdict] - VERDICT_BUCKET[b.verdict] || evidenceStrength(b) - evidenceStrength(a),
  )[0] as ClaimAssessment;
  return {
    bucket: VERDICT_BUCKET[best.verdict],
    verdict: best.verdict,
    strength: evidenceStrength(best),
    strongClaims,
    claim: best,
  };
}

/**
 * Most actionable first: reproduced, then contradicted, not reproduced, insufficient evidence,
 * failed. Ties go to the stronger evidence, then more strongly evidenced claims, then paste order.
 */
export function rankItems<T extends RankInput>(items: T[]): T[] {
  const keyed = items.map((item) => ({ item, h: headline(item) }));
  keyed.sort(
    (a, b) =>
      a.h.bucket - b.h.bucket ||
      b.h.strength - a.h.strength ||
      b.h.strongClaims - a.h.strongClaims ||
      a.item.index - b.item.index,
  );
  return keyed.map((k) => k.item);
}

export function headlineEvidence(h: Headline): string {
  return h.verdict === null ? "—" : evidenceLevelText(h.strength);
}
