import type {
  Confidence,
  EvidenceKind,
  Report,
  TriageLabel,
  Verdict,
} from "../types";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeTableCell(text: string): string {
  return text
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "\\|")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^[#>|]/, (c) => `\\${c}`);
}

function formatTriageLabel(label: TriageLabel): string {
  switch (label) {
    case "confirmed":
      return "Confirmed";
    case "invalid":
      return "Likely invalid";
    case "cannot-reproduce":
      return "Could not reproduce";
    case "needs-info":
      return "Needs more information";
    case "needs-human-review":
      return "Needs human review";
  }
}

function formatVerdict(verdict: Verdict): string {
  switch (verdict) {
    case "reproduced":
      return "Reproduced";
    case "contradicted":
      return "Contradicted";
    case "not_reproduced":
      return "Not reproduced";
    case "insufficient_evidence":
      return "Insufficient evidence";
  }
}

function formatConfidence(confidence: Confidence): string {
  switch (confidence) {
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    case "none":
      return "None";
  }
}

function formatEvidenceKind(kind: EvidenceKind): string {
  switch (kind) {
    case "executed_repro":
      return "Executed reproduction";
    case "failing_test":
      return "Failing test";
    case "static_proof":
      return "Static code check";
    case "doc_contradiction":
      return "Documentation";
    case "plausible_text":
      return "Text only";
    case "none":
      return "No evidence";
  }
}

function getSafeCodeFence(content: string): string {
  const matches = content.match(/`+/g);
  if (!matches) return "```";
  const maxBackticks = Math.max(...matches.map((m) => m.length));
  return "`".repeat(Math.max(3, maxBackticks + 1));
}

export function renderReportMarkdown(report: Report): string {
  const { owner, repo, number, url, commit } = report.target;
  const sections: string[] = [];

  // 1. Heading
  sections.push(`# Pramaan evidence report: ${owner}/${repo}#[${number}](${url})`);

  // 2. Verified commit
  if (commit) {
    const shortSha = commit.slice(0, 7);
    sections.push(
      `**Verified commit:** [${shortSha}](https://github.com/${owner}/${repo}/commit/${commit})`,
    );
  } else {
    sections.push(`**Verified commit:** No checkout was needed`);
  }

  // 3. Suggested label and rationale
  const labelHuman = formatTriageLabel(report.triage.label);
  sections.push(
    `**Suggested label:** **${labelHuman}**\n${escapeHtml(report.triage.rationale)}\n\n_Suggested label only — Pramaan never closes issues._`,
  );

  // 4. Abstained warning if applicable
  if (report.extraction.status === "abstained") {
    sections.push(
      `> [!WARNING]\n> **Claim extraction abstained:** ${escapeHtml(report.extraction.reason)}\n> A human should read the report directly.`,
    );
  }

  // 5. Summary Table
  const tableHeaders = [
    "| # | Claim | Verdict | Confidence | Human review |",
    "|---|---|---|---|---|",
  ];
  const tableRows = report.assessments.map((a, i) => {
    const claimEscaped = escapeTableCell(a.claim.statement);
    const verdict = formatVerdict(a.verdict);
    const confidence = formatConfidence(a.confidence);
    const humanReview = a.needsHumanReview ? "Yes" : "No";
    return `| ${i + 1} | ${claimEscaped} | ${verdict} | ${confidence} | ${humanReview} |`;
  });
  sections.push([...tableHeaders, ...tableRows].join("\n"));

  // 6. One section per claim
  for (let i = 0; i < report.assessments.length; i++) {
    const a = report.assessments[i]!;
    const claimNum = i + 1;
    const claimLines: string[] = [];

    // Statement
    let escapedStatement = escapeHtml(a.claim.statement);
    if (escapedStatement.startsWith("#")) escapedStatement = "\\" + escapedStatement;
    claimLines.push(`### Claim ${claimNum}: ${escapedStatement}`);

    // Quote
    const quoteLines = escapeHtml(a.claim.quote)
      .split("\n")
      .map((l) => `> ${l.startsWith("#") ? "\\" + l : l}`)
      .join("\n");
    claimLines.push(quoteLines);

    // Evidence bullet list
    claimLines.push(`**Evidence:**`);
    if (a.evidence.length === 0) {
      claimLines.push(`- No evidence recorded`);
    } else {
      for (const ev of a.evidence) {
        const kindHuman = formatEvidenceKind(ev.kind);
        const summary = escapeHtml(ev.summary);
        const permalink = ev.location?.permalink ? ` [code](${ev.location.permalink})` : "";
        let bullet = `- **${kindHuman}:** ${summary}${permalink}`;

        if (ev.log !== undefined) {
          const lines = ev.log.split("\n");
          let logContent = ev.log;
          if (lines.length > 40) {
            const truncated = lines.slice(0, 40).join("\n");
            logContent = `${truncated}\n… (${lines.length - 40} more lines)`;
          }

          const fence = getSafeCodeFence(logContent);
          bullet += `\n  <details><summary>Output</summary>\n\n  ${fence}\n  ${logContent.replace(/\n/g, "\n  ")}\n  ${fence}\n  </details>`;
        }
        claimLines.push(bullet);
      }
    }

    // What is missing
    claimLines.push(`**What is missing:**`);
    if (a.missing.length === 0) {
      claimLines.push(`- None`);
    } else {
      for (const m of a.missing) {
        claimLines.push(`- ${escapeHtml(m)}`);
      }
    }

    sections.push(claimLines.join("\n\n"));
  }

  // 7. Footer
  const modelsText = report.models.length > 0 ? report.models.join(", ") : "no model";
  sections.push(
    `---\nGenerated by Pramaan at ${report.generatedAt} using ${modelsText}. Verdicts come from code checks, not from the model.`,
  );

  return sections.join("\n\n") + "\n";
}
