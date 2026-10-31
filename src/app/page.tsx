"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startAnalysis } from "./lib/api";

const GITHUB_URL_RE = /^https:\/\/github\.com\/[^/]+\/[^/]+\/(issues|pull)\/\d+$/;

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
      <h1>Pramaan</h1>
      <p>
        Pramaan splits a GitHub issue or pull request into individual technical claims, verifies each claim
        against the repository code, and shows maintainers the evidence. When it cannot verify a claim, it
        says so. Pramaan never auto-closes anything — it only suggests a triage label.
      </p>

      <a href="/jobs/sample" className="preview-link">
        → Preview with sample report
      </a>

      <h2>Start an analysis</h2>

      {serverError && (
        <div className="error-banner" role="alert">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="targetUrl">
            Issue or pull request URL <span style={{ color: "var(--tone-refuted-text)" }}>*</span>
          </label>
          <input
            id="targetUrl"
            type="url"
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

        <div className="form-group">
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

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Starting analysis…" : "Analyse"}
        </button>
      </form>
    </main>
  );
}
