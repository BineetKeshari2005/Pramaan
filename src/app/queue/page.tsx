"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CopyCommentButton from "../components/CopyCommentButton";
import JobProgress from "../components/JobProgress";
import ReportView from "../components/ReportView";
import { getJobStatus, startAnalysis, type JobStatusResponse } from "../lib/api";
import { jobStatusText, stageLabel, verdictLabel, verdictTone } from "../lib/present";
import {
  headline,
  headlineEvidence,
  MAX_LINKS,
  parseQueueInput,
  type QueueState,
  rankFieldsFromJob,
  rankItems,
  type RankInput,
} from "../lib/queue";

const EXAMPLE_LINKS = [
  "https://github.com/more-itertools/more-itertools/pull/1342",
  "https://github.com/sqlmapproject/sqlmap/issues/6154",
  "https://github.com/shouryapratap132006/cineverse/pull/8",
].join("\n");

const POLL_MS = 2000;
const MAX_POLL_FAILURES = 5;

interface Item extends RankInput {
  key: string;
  url: string;
  kind: "issue" | "pull" | null;
  label: string;
  state: QueueState;
  error?: string;
  jobId?: string;
  job?: JobStatusResponse;
  failures: number;
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function fromJob(item: Item, job: JobStatusResponse): Item {
  const t = job.target;
  return {
    ...item,
    ...rankFieldsFromJob(job),
    job,
    url: job.input.targetUrl,
    kind: t.kind,
    label: `${t.owner}/${t.repo}#${t.number}`,
    error: job.status === "failed" ? (job.error ?? "The check failed.") : undefined,
    failures: 0,
  };
}

function reasonFor(item: Item): string {
  const h = headline(item);
  if (item.state === "invalid" || item.state === "failed") return item.error ?? "The check failed.";
  if (item.state === "queued") {
    const pos = item.job?.queuePosition;
    return pos ? `Waiting in line (position ${pos})` : "Waiting in line";
  }
  if (item.state === "running") {
    const last = item.job?.progress[item.job.progress.length - 1];
    return last ? `${stageLabel(last.stage)}…` : "Starting…";
  }
  if (h.claim) return clip(h.claim.claim.statement, 160);
  return item.job?.report?.triage.rationale ?? "No checkable claims.";
}

function ResultTag({ item }: { item: Item }) {
  const h = headline(item);
  if (item.state === "invalid") return <span className="tag unknown">Invalid link</span>;
  if (item.state === "failed") return <span className="tag refuted">Failed</span>;
  if (item.state === "queued" || item.state === "running") {
    return <span className={`status-chip status-chip-${item.state}`}>{jobStatusText(item.state)}</span>;
  }
  if (!h.verdict) return <span className="tag unknown">No claims</span>;
  return <span className={`tag ${verdictTone(h.verdict)}`}>{verdictLabel(h.verdict)}</span>;
}

const ghUrl = (item: Item) => (item.state === "invalid" ? undefined : item.url || undefined);

export default function QueuePage() {
  const [text, setText] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const itemsRef = useRef<Item[]>([]);
  const viewerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const parsed = useMemo(() => parseQueueInput(text), [text]);
  const ranked = useMemo(() => rankItems(items), [items]);
  const started = items.length > 0;

  // Reopen a queue from its address (?jobs=id1,id2): the jobs keep running on the server.
  useEffect(() => {
    const ids = new URLSearchParams(window.location.search).get("jobs")?.split(",").filter(Boolean) ?? [];
    if (ids.length === 0) return;
    setItems(
      ids.slice(0, MAX_LINKS).map((id, index) => ({
        index,
        key: id,
        url: "",
        kind: null,
        label: "Loading…",
        state: "queued",
        jobId: id,
        failures: 0,
      })),
    );
  }, []);

  // Poll every unfinished job until all are done or failed.
  useEffect(() => {
    if (!started) return;
    const poll = async () => {
      const pending = itemsRef.current.filter((i) => i.jobId && (i.state === "queued" || i.state === "running"));
      if (pending.length === 0) return;
      const results = await Promise.all(
        pending.map(async (i) => {
          try {
            return { key: i.key, job: await getJobStatus(i.jobId as string) };
          } catch {
            return { key: i.key, job: null };
          }
        }),
      );
      setItems((prev) =>
        prev.map((item) => {
          const r = results.find((x) => x.key === item.key);
          if (!r) return item;
          if (r.job) return fromJob(item, r.job);
          const failures = item.failures + 1;
          return failures >= MAX_POLL_FAILURES
            ? { ...item, failures, state: "failed", error: "Lost contact with this check." }
            : { ...item, failures };
        }),
      );
    };
    void poll();
    const timer = setInterval(() => void poll(), POLL_MS);
    return () => clearInterval(timer);
  }, [started]);

  // Follow the top-ranked item until the maintainer picks one.
  const selected = ranked.find((i) => i.key === selectedKey) ?? ranked[0];
  const position = selected ? ranked.indexOf(selected) : -1;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (parsed.error) {
      setFormError(parsed.error);
      return;
    }
    setFormError("");
    setSubmitting(true);
    const initial: Item[] = parsed.lines.map((l) => ({
      index: l.index,
      key: `line-${l.index}`,
      url: l.url,
      kind: l.kind,
      label: l.label,
      state: l.error ? "invalid" : "queued",
      error: l.error,
      failures: 0,
    }));
    setItems(initial);
    setSelectedKey(null);

    // Submit one at a time; the server runs them one at a time too.
    const ids: string[] = [];
    for (const item of initial.filter((i) => i.state !== "invalid")) {
      try {
        const res = await startAnalysis({ targetUrl: item.url });
        ids.push(res.jobId);
        setItems((prev) => prev.map((p) => (p.key === item.key ? { ...p, jobId: res.jobId } : p)));
      } catch (err) {
        const error = err instanceof Error ? err.message : "Could not start this check.";
        setItems((prev) => prev.map((p) => (p.key === item.key ? { ...p, state: "failed", error } : p)));
      }
    }
    if (ids.length > 0) window.history.replaceState(null, "", `/queue?jobs=${ids.join(",")}`);
    setSubmitting(false);
  }

  function reset() {
    setItems([]);
    setSelectedKey(null);
    window.history.replaceState(null, "", "/queue");
  }

  function show(key: string, scroll: boolean) {
    setSelectedKey(key);
    if (scroll) viewerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function step(delta: number) {
    const next = ranked[position + delta];
    if (next) setSelectedKey(next.key);
  }

  // ---------- Input ----------
  if (!started) {
    return (
      <main className="page-container">
        <section className="hero hero-compact">
          <span className="eyebrow">Triage queue</span>
          <h1 className="hero-title">
            Check several reports <em>at once.</em>
          </h1>
          <p className="hero-sub">
            Paste 2 to 10 GitHub issue or pull request links. Pramaan checks them one at a time and lists the ones
            with the strongest evidence first.
          </p>
        </section>

        <section className="card" aria-labelledby="links-heading">
          <h2 id="links-heading">Links to check</h2>
          <p className="card-sub">One link per line. Issues and pull requests can come from different repositories.</p>
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="queue-links" className="sr-only">
              Links, one per line
            </label>
            <textarea
              id="queue-links"
              className="queue-input"
              rows={7}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setFormError("");
              }}
              placeholder={"https://github.com/owner/repo/issues/123\nhttps://github.com/owner/repo/pull/456"}
              spellCheck={false}
              disabled={submitting}
            />

            {parsed.lines.length > 0 && (
              <ul className="queue-preview" aria-label="Links found">
                {parsed.lines.map((l) => (
                  <li key={l.index} className={l.error ? "bad" : ""}>
                    {l.error ? (
                      <span className="tag unknown">Skipped</span>
                    ) : (
                      <span className={`kind-badge ${l.kind}`}>{l.kind === "pull" ? "PR" : "Issue"}</span>
                    )}
                    <span className="queue-preview-label">{clip(l.label, 80)}</span>
                    {l.error && <span className="queue-preview-error">{l.error}</span>}
                  </li>
                ))}
              </ul>
            )}

            {formError && (
              <div className="error-banner" role="alert">
                {formError}
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting || parsed.valid === 0}>
                {parsed.valid > 0 ? `Check ${parsed.valid} link${parsed.valid === 1 ? "" : "s"} →` : "Check links →"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setText(EXAMPLE_LINKS)}>
                Use example links
              </button>
            </div>
            <p className="queue-note">
              Checks run one at a time, and each takes a few minutes. Nothing is closed or labelled on GitHub.
            </p>
          </form>
        </section>
      </main>
    );
  }

  // ---------- Results ----------
  const checkable = items.filter((i) => i.state !== "invalid");
  const finished = checkable.filter((i) => i.state === "done" || i.state === "failed").length;
  const skipped = items.length - checkable.length;
  const pct = checkable.length === 0 ? 100 : Math.round((finished / checkable.length) * 100);

  return (
    <main className="page-container page-wide">
      <div className="status-header queue-head">
        <div>
          <p className="status-kind">Triage queue</p>
          <h1>
            {finished} of {checkable.length} checked
          </h1>
          {skipped > 0 && (
            <p className="status-title">
              {skipped} line{skipped === 1 ? " was" : "s were"} skipped.
            </p>
          )}
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={reset} disabled={submitting}>
          New queue
        </button>
        <div
          className="progress-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Checks finished"
        >
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      <p className="queue-note">
        Ordered by evidence strength: proven problems first, then claims the code contradicts, then the rest. This is a
        reading order, not a verdict, and nothing is closed or labelled on GitHub.
      </p>

      <ol className="queue-list" aria-label="Ranked results">
        {ranked.map((item, i) => {
          const h = headline(item);
          const isFinished = item.state === "done" || item.state === "failed";
          const href = ghUrl(item);
          return (
            <li key={item.key} className={`queue-row${selected?.key === item.key ? " selected" : ""}`}>
              <span className="queue-rank" aria-label={isFinished ? `Rank ${i + 1}` : "Not ranked yet"}>
                {isFinished ? i + 1 : "–"}
              </span>
              <div className="queue-main">
                <div className="queue-title">
                  {item.kind && <span className={`kind-badge ${item.kind}`}>{item.kind === "pull" ? "PR" : "Issue"}</span>}
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {item.label}
                    </a>
                  ) : (
                    <span>{clip(item.label, 60)}</span>
                  )}
                </div>
                {item.job?.report?.target.title && (
                  <p className="queue-subtitle">{clip(item.job.report.target.title, 110)}</p>
                )}
                <p className="queue-reason">{reasonFor(item)}</p>
              </div>
              <div className="queue-result">
                <ResultTag item={item} />
                {h.verdict && <span className="queue-level">Evidence: {headlineEvidence(h)}</span>}
              </div>
              <div className="queue-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => show(item.key, true)}>
                  View
                </button>
                {item.state === "done" && item.job?.report && <CopyCommentButton report={item.job.report} small />}
              </div>
            </li>
          );
        })}
      </ol>

      {selected && (
        <section className="viewer" ref={viewerRef} aria-label="Selected result">
          <div className="viewer-bar">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => step(-1)}
              disabled={position <= 0}
            >
              ‹ Previous
            </button>
            <div
              className="viewer-tabs"
              role="tablist"
              aria-label="Results"
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") step(1);
                if (e.key === "ArrowLeft") step(-1);
              }}
            >
              {ranked.map((item, i) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={item.key === selected.key}
                  title={item.label}
                  className={`viewer-tab${item.key === selected.key ? " active" : ""}`}
                  onClick={() => show(item.key, false)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => step(1)}
              disabled={position >= ranked.length - 1}
            >
              Next ›
            </button>
          </div>

          <div className="status-header">
            <p className="status-kind">
              Result {position + 1} of {ranked.length}
              {selected.kind ? ` · ${selected.kind === "pull" ? "Pull request" : "Issue"}` : ""}
            </p>
            <h1>
              {ghUrl(selected) ? (
                <a href={ghUrl(selected)} target="_blank" rel="noopener noreferrer">
                  {selected.label}
                </a>
              ) : (
                clip(selected.label, 60)
              )}
            </h1>
            {selected.job?.report?.target.title && <p className="status-title">{selected.job.report.target.title}</p>}
            <div className="status-meta">
              <ResultTag item={selected} />
              {selected.jobId && (
                <a href={`/jobs/${selected.jobId}`} target="_blank" rel="noopener noreferrer">
                  Open as its own page ↗
                </a>
              )}
            </div>
          </div>

          {selected.state === "invalid" && (
            <div className="error-banner" role="alert">
              {selected.error} This line was not checked.
            </div>
          )}
          {selected.state === "failed" && (
            <div className="error-banner" role="alert">
              {selected.error ?? "The check failed."} The other links were not affected.
            </div>
          )}
          {(selected.state === "queued" || selected.state === "running") &&
            (selected.job ? (
              <JobProgress job={selected.job} />
            ) : (
              <section className="progress-card">
                <h2>Starting…</h2>
              </section>
            ))}
          {selected.state === "done" && selected.job?.report && <ReportView report={selected.job.report} />}
        </section>
      )}
    </main>
  );
}
