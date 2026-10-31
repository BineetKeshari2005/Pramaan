"use client";

import type { ClaimAssessment } from "../../core/types";
import {
  confidenceLabel,
  evidenceKindLabel,
  verdictLabel,
  verdictTone,
} from "../lib/present";
import RichText from "./RichText";

interface ClaimCardProps {
  assessment: ClaimAssessment;
  index: number;
}

export default function ClaimCard({ assessment, index }: ClaimCardProps) {
  const { claim, verdict, confidence, evidence, missing, needsHumanReview } = assessment;
  const tone = verdictTone(verdict);

  const hasFiles = claim.references.files.length > 0;
  const hasSymbols = claim.references.symbols.length > 0;
  const hasLines = claim.references.lines.length > 0;
  const hasVersions = claim.references.versions.length > 0;
  const hasRefs = hasFiles || hasSymbols || hasLines || hasVersions;

  return (
    <article className="claim-card" aria-labelledby={`claim-heading-${index}`}>
      <div className="claim-card-header">
        <div className="claim-meta">
          <span className={`verdict-badge ${tone}`} aria-label={`Verdict: ${verdictLabel(verdict)}`}>
            {verdictLabel(verdict)}
          </span>
          <span className="confidence-label">{confidenceLabel(confidence, verdict)}</span>
          {needsHumanReview && (
            <span className="human-review-flag" aria-label="Needs human review">
              ⚠ Needs human review
            </span>
          )}
        </div>
      </div>

      <div className="claim-card-body">
        <h3 id={`claim-heading-${index}`}>
          <RichText text={claim.statement} />
        </h3>

        {claim.quote && (
          <>
            <p className="claim-section-label">From the report</p>
            <blockquote className="claim-quote">
              <RichText text={claim.quote} />
            </blockquote>
          </>
        )}

        <p className="claim-section-label">Claim type</p>
        <p style={{ margin: "0 0 8px", fontSize: "0.9rem" }}>{claim.type.replace(/_/g, " ")}</p>

        {hasRefs && (
          <>
            <p className="claim-section-label">References</p>
            <ul className="refs-list">
              {claim.references.files.map((f) => (
                <li key={`file-${f}`}>
                  <span className="ref-tag">📄 {f}</span>
                </li>
              ))}
              {claim.references.symbols.map((s) => (
                <li key={`sym-${s}`}>
                  <span className="ref-tag">⚙ {s}</span>
                </li>
              ))}
              {claim.references.lines.map((l) => (
                <li key={`line-${l.file}-${l.line}`}>
                  <span className="ref-tag">
                    {l.file}:{l.line}
                  </span>
                </li>
              ))}
              {claim.references.versions.map((v) => (
                <li key={`ver-${v}`}>
                  <span className="ref-tag">🏷 {v}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {evidence.length > 0 && (
          <>
            <p className="claim-section-label">Evidence</p>
            {evidence.map((ev, i) => (
              <div key={i} className="evidence-item">
                <div className="evidence-item-header">
                  <span className="evidence-kind">{evidenceKindLabel(ev.kind)}</span>
                  <span className="evidence-source">via {ev.source}</span>
                </div>
                <div className="evidence-item-body">
                  <p style={{ margin: "0 0 6px" }}>
                    <RichText text={ev.summary} />
                  </p>
                  {ev.location?.permalink && (
                    <a href={ev.location.permalink} target="_blank" rel="noopener noreferrer">
                      View code at this commit →
                    </a>
                  )}
                  {ev.log && (
                    <details className="evidence-log" style={{ marginTop: 8 }}>
                      <summary>Show output</summary>
                      <pre>{ev.log}</pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {missing.length > 0 && (
          <>
            <p className="claim-section-label">What is missing</p>
            <ul className="missing-list">
              {missing.map((m, i) => (
                <li key={i}>
                  <RichText text={m} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </article>
  );
}
