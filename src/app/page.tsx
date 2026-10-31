"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startAnalysis } from "./lib/api";

const GITHUB_URL_RE = /^https:\/\/github\.com\/[^/]+\/[^/]+\/(issues|pull)\/\d+$/;

const EXAMPLES = [
  { label: "more-itertools#1342", url: "https://github.com/more-itertools/more-itertools/pull/1342" },
  { label: "sqlmap#6154", url: "https://github.com/sqlmapproject/sqlmap/issues/6154" },
];

const STEPS = [
  {
    title: "Read",
    body: "An AI model reads the issue and writes down each claim it makes, like “parse() crashes on empty input”. It must quote the exact words, so it cannot invent claims.",
  },
  {
    title: "Check",
    body: "Pramaan checks each claim in the code. Does that file exist? Does that function exist? Do the tests fail without the fix? Tests run in a locked sandbox.",
  },
  {
    title: "Report",
    body: "You get a simple answer for every claim, the proof behind it, and a suggested label. The same proof always gives the same answer.",
  },
];

const PRINCIPLES = [
  { title: "AI reads, code decides.", body: "The AI never gives the verdict." },
  { title: "Honest when unsure.", body: "If it cannot check something, it says so." },
  { title: "Never closes anything.", body: "It suggests a label. You decide." },
  { title: "Runs on your machine.", body: "No paid AI service; the model runs locally." },
];

export default function Home() {
  const router = useRouter();

  const [targetUrl, setTargetUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [commit, setCommit] = useState("");
  const [buildCommand, setBuildCommand] = useState("");
  const [testCommand, setTestCommand] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [serverError, setServerError] = useState("");

  function validateTargetUrl(val: string): string {
    if (!val.trim()) return "Issue or pull request URL is required.";
    if (!GITHUB_URL_RE.test(val.trim())) {
      return "Must be a valid GitHub issue or PR URL, e.g. https://github.com/owner/repo/issues/1";
    }
    return "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError("");

    const err = validateTargetUrl(targetUrl);
    setUrlError(err);
    if (err) return;

    setSubmitting(true);
    try {
      const result = await startAnalysis({
        targetUrl: targetUrl.trim(),
        ...(repoUrl.trim() ? { repoUrl: repoUrl.trim() } : {}),
        ...(commit.trim() ? { commit: commit.trim() } : {}),
        ...(buildCommand.trim() ? { buildCommand: buildCommand.trim() } : {}),
        ...(testCommand.trim() ? { testCommand: testCommand.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      router.push(`/jobs/${result.jobId}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setSubmitting(false);
    }
  }

  return (
    <main className="page-container">
      <section className="hero">
        <span className="eyebrow">For open-source maintainers</span>
        <h1 className="hero-title">
          Check bug reports
          <br />
          <em>against the code.</em>
        </h1>
        <p className="hero-sub">
          Paste a GitHub issue or pull request. Pramaan lists every claim in it, checks each one in the code, and
          shows you which ones hold up, with the proof.
        </p>
      </section>

      <div className="stat-strip hero-stats">
        <div className="stat-cell">
          <span className="stat-cell-label">Real bugs wrongly dismissed</span>
          <span className="stat-cell-value">0</span>
          <span className="stat-cell-note">
            <span className="tag confirmed">27 issues tested</span>
          </span>
        </div>
        <div className="stat-cell">
          <span className="stat-cell-label">Where tests run</span>
          <span className="stat-cell-value">Sandbox</span>
          <span className="stat-cell-note">no internet access</span>
        </div>
        <div className="stat-cell">
          <span className="stat-cell-label">AI model</span>
          <span className="stat-cell-value">Local</span>
          <span className="stat-cell-note">open-weight, on your machine</span>
        </div>
      </div>

      <section className="card" id="analyse" aria-labelledby="analyse-heading">
        <h2 id="analyse-heading">Check an issue or pull request</h2>
        <p className="card-sub">Paste a link to a public GitHub issue or pull request. It usually takes a few minutes.</p>

        {serverError && (
          <div className="error-banner" role="alert">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="targetUrl">
              Issue or pull request URL <span className="label-required">*</span>
            </label>
            <input
              id="targetUrl"
              type="url"
              className="input-hero"
              value={targetUrl}
              onChange={(e) => {
                setTargetUrl(e.target.value);
                if (urlError) setUrlError(validateTargetUrl(e.target.value));
              }}
              onBlur={() => setUrlError(validateTargetUrl(targetUrl))}
              placeholder="https://github.com/owner/repo/issues/123"
              required
              aria-describedby={urlError ? "targetUrl-error" : undefined}
              aria-invalid={urlError ? "true" : undefined}
              disabled={submitting}
              autoComplete="url"
            />
            {urlError && (
              <span id="targetUrl-error" className="field-error" role="alert">
                {urlError}
              </span>
            )}
          </div>

          <details className="advanced">
            <summary>Advanced options</summary>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="repoUrl">
                  GitHub repository URL<span className="label-optional">(optional)</span>
                </label>
                <input
                  id="repoUrl"
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  disabled={submitting}
                  autoComplete="url"
                />
              </div>

              <div className="form-group">
                <label htmlFor="commit">
                  Commit or version<span className="label-optional">(optional)</span>
                </label>
                <input
                  id="commit"
                  type="text"
                  value={commit}
                  onChange={(e) => setCommit(e.target.value)}
                  placeholder="abc1234 or v2.3.0"
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="buildCommand">
                  Build command<span className="label-optional">(optional)</span>
                </label>
                <input
                  id="buildCommand"
                  type="text"
                  value={buildCommand}
                  onChange={(e) => setBuildCommand(e.target.value)}
                  placeholder="npm run build"
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="testCommand">
                  Test command<span className="label-optional">(optional)</span>
                </label>
                <input
                  id="testCommand"
                  type="text"
                  value={testCommand}
                  onChange={(e) => setTestCommand(e.target.value)}
                  placeholder="npm test"
                  disabled={submitting}
                />
              </div>

              <div className="form-group form-span">
                <label htmlFor="notes">
                  Notes<span className="label-optional">(optional)</span>
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any context that might help with the analysis…"
                  disabled={submitting}
                />
              </div>
            </div>
          </details>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Starting…" : "Check it →"}
            </button>
            <a href="/jobs/sample" className="preview-link">
              or see a sample report
            </a>
          </div>

          <div className="examples">
            <span>Try:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.url}
                type="button"
                className="example-pill"
                disabled={submitting}
                onClick={() => {
                  setTargetUrl(ex.url);
                  setUrlError("");
                }}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </form>
      </section>

      <section id="how" aria-labelledby="how-heading">
        <h2 id="how-heading" className="section-title">
          How it works
        </h2>
        <p className="section-sub">Three steps. The AI only does the reading; the code decides.</p>
        <div className="how-grid">
          {STEPS.map((step, i) => (
            <div className="how-card" key={step.title}>
              <span className="step-num" aria-hidden="true">
                {i + 1}
              </span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
        <ul className="principles">
          {PRINCIPLES.map((p) => (
            <li key={p.title}>
              <span className="check" aria-hidden="true">
                ✓
              </span>
              <span>
                <strong>{p.title}</strong> {p.body}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
