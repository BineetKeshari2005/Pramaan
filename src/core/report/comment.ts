import { CONTEXT_ONLY } from "../grading";
import type { ClaimAssessment, Evidence, EvidenceKind, Report, TriageLabel, Verdict } from "../types";

/** GitHub rejects issue and pull request comments longer than this. */
export const GITHUB_COMMENT_LIMIT = 65_536;
// Headroom for the maintainer to add a line of their own before posting.
const BUDGET = GITHUB_COMMENT_LIMIT - 1_000;

const VERDICT_TEXT: Record<Verdict, string> = {
  reproduced: "Reproduced",
  contradicted: "Contradicted",
  not_reproduced: "Not reproduced",
  insufficient_evidence: "Insufficient evidence",
};

const KIND_TEXT: Record<EvidenceKind, string> = {
  executed_repro: "Executed reproduction",
  failing_test: "Failing test",
  static_proof: "Static code check",
  doc_contradiction: "Documentation",
  plausible_text: "Report text only",
  none: "No evidence",
};

const KIND_STRENGTH: Record<EvidenceKind, number> = {
  executed_repro: 3,
  failing_test: 3,
  static_proof: 2,
  doc_contradiction: 2,
  plausible_text: 1,
  none: 0,
};

const LEVEL_TEXT = ["None", "Report text only", "Static check", "Executed"] as const;

// What each label says about the evidence. Never that a report is fake or should be closed.
const LABEL_MEANING: Record<TriageLabel, string> = {
  confirmed: "the code checks back up the report",
  invalid: "the code contradicts the checkable claims as written",
  "cannot-reproduce": "the reported behavior did not occur when checked",
  "needs-info": "the evidence is not enough to decide either way",
  "needs-human-review": "some claims need a maintainer's judgement",
};

// ---------- Evidence strength (shared with the triage queue ranking) ----------

/** 3 executed, 2 static check or docs, 1 report text only, 0 nothing. */
export function evidenceStrength(a: ClaimAssessment): number {
  return a.evidence.reduce((max, e) => Math.max(max, KIND_STRENGTH[e.kind]), 0);
}

export function evidenceLevelText(strength: number): string {
  return LEVEL_TEXT[Math.max(0, Math.min(3, strength))] ?? "None";
}

function strongestEvidence(a: ClaimAssessment): Evidence | undefined {
  return [...a.evidence].sort((x, y) => KIND_STRENGTH[y.kind] - KIND_STRENGTH[x.kind])[0];
}

// ---------- Untrusted text ----------

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…` : text;
}

/**
 * Report text, claims and verifier summaries quote the issue, which anyone can write.
 * Render them as one inert line: no HTML, no Markdown structure or links, no @mentions,
 * no #123 or GH-123 cross-references, and no autolinked URLs that would notify other threads.
 */
export function safeInline(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/[`*_[\]|~]/g, (c) => `\\${c}`)
    .replace(/^([#+=-])/, "\\$1")
    .replace(/^(\d+)\./, "$1\\.")
    // "#" first: every later step inserts "&#8203;", whose own "#8" must not be rewritten.
    .replace(/#(?=\d)/g, "#&#8203;")
    .replace(/@(?=[A-Za-z0-9])/g, "@&#8203;")
    .replace(/\b(gh)-(?=\d)/gi, "$1-&#8203;")
    .replace(/\b(https?):\/\//gi, "$1:&#8203;//")
    .replace(/\bwww\./gi, "www&#8203;.");
}

/** A fence longer than any backtick run in the log, so the log cannot close it early. */
function fenceFor(log: string): string {
  const longest = Math.max(0, ...(log.match(/`+/g) ?? []).map((run) => run.length));
  return "`".repeat(Math.max(3, longest + 1));
}

function trimLog(log: string, maxLines: number, maxChars: number): string {
  const lines = log.replace(/\r\n/g, "\n").split("\n");
  let out = lines.slice(0, maxLines).join("\n");
  if (out.length > maxChars) out = out.slice(0, maxChars);
  const dropped = lines.length - Math.min(lines.length, maxLines);
  return dropped > 0 || out.length < log.length ? `${out}\n… (output shortened)` : out;
}

const isGitHubLink = (url: string) => /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/(blob|tree|commit)\//.test(url);

// ---------- Rendering ----------

interface Budget {
  logLines: number;
  logChars: number;
  details: boolean;
  evidenceChars: number;
  missingItems: number;
  claimChars: number;
}

// Tried in order until the comment fits. Each step cuts evidence, never a verdict.
const BUDGETS: Budget[] = [
  { logLines: 40, logChars: 4_000, details: true, evidenceChars: 400, missingItems: 10, claimChars: 600 },
  { logLines: 12, logChars: 1_200, details: true, evidenceChars: 300, missingItems: 6, claimChars: 500 },
  { logLines: 0, logChars: 0, details: true, evidenceChars: 200, missingItems: 4, claimChars: 400 },
  { logLines: 0, logChars: 0, details: false, evidenceChars: 160, missingItems: 3, claimChars: 300 },
  { logLines: 0, logChars: 0, details: false, evidenceChars: 0, missingItems: 0, claimChars: 120 },
];

export function summaryLine(report: Report): string {
  const n = report.assessments.length;
  if (n === 0) return "No technical claims could be checked.";
  const counts = (Object.keys(VERDICT_TEXT) as Verdict[])
    .map((v) => [v, report.assessments.filter((a) => a.verdict === v).length] as const)
    .filter(([, count]) => count > 0)
    .map(([v, count]) => `${count} ${VERDICT_TEXT[v].toLowerCase()}`);
  return `${n} claim${n === 1 ? "" : "s"} checked: ${counts.join(", ")}`;
}

function renderClaim(a: ClaimAssessment, i: number, b: Budget): string {
  const parts: string[] = [];
  parts.push(`#### Claim ${i + 1}: ${VERDICT_TEXT[a.verdict]}`);
  parts.push(`> ${safeInline(clip(a.claim.statement, b.claimChars))}`);

  const best = strongestEvidence(a);
  const level = `**Evidence level:** ${evidenceLevelText(evidenceStrength(a))}`;
  parts.push(
    best && b.evidenceChars > 0
      ? `${level} · **Evidence:** ${KIND_TEXT[best.kind]}: ${safeInline(clip(best.summary, b.evidenceChars))}`
      : level,
  );

  if (b.details && a.evidence.length > 0) {
    const items = a.evidence.map((e) => {
      const link = e.location?.permalink && isGitHubLink(e.location.permalink) ? ` ([code](${e.location.permalink}))` : "";
      const line = `- **${KIND_TEXT[e.kind]}** (${safeInline(e.source)}): ${safeInline(clip(e.summary, b.evidenceChars * 2))}${link}`;
      if (!e.log || b.logLines === 0) return line;
      const log = trimLog(e.log, b.logLines, b.logChars);
      const fence = fenceFor(log);
      return `${line}\n\n${fence}text\n${log}\n${fence}`;
    });
    parts.push(
      `<details><summary>Detailed evidence (${a.evidence.length})</summary>\n\n${items.join("\n\n")}\n\n</details>`,
    );
  }

  const missing = a.missing.filter((m) => m !== CONTEXT_ONLY);
  if (b.missingItems > 0 && missing.length > 0) {
    const shown = missing.slice(0, b.missingItems).map((m) => `- ${safeInline(clip(m, 240))}`);
    if (missing.length > b.missingItems) shown.push(`- … and ${missing.length - b.missingItems} more`);
    parts.push(`**What is missing:**\n${shown.join("\n")}`);
  }
  return parts.join("\n\n");
}

function render(report: Report, b: Budget, trimmed: boolean): string {
  const { owner, repo, number, url, kind, commit } = report.target;
  const sections: string[] = [];

  sections.push(`### Pramaan evidence check\n\n**${summaryLine(report)}**`);

  const versions = [...new Set(report.assessments.flatMap((a) => a.claim.references.versions))].slice(0, 3);
  const checkedAt = commit
    ? `checked at commit [\`${commit.slice(0, 7)}\`](https://github.com/${owner}/${repo}/commit/${commit})`
    : "no code checkout was needed";
  const versionText = versions.length > 0 ? ` · reported version: ${versions.map((v) => safeInline(v)).join(", ")}` : "";
  sections.push(
    `**Target:** [${owner}/${repo}#${number}](${url}) (${kind === "pull" ? "pull request" : "issue"}) · ${checkedAt}${versionText}`,
  );

  const label = report.triage.label;
  sections.push(
    `**Suggested label:** \`${label}\`, ${LABEL_MEANING[label]}. _Suggestion only._\n**Why:** ${safeInline(report.triage.rationale)}`,
  );

  if (report.extraction.status === "abstained") {
    sections.push(`**Note:** Pramaan could not extract claims from this report (${safeInline(report.extraction.reason)}).`);
  }

  if (report.assessments.length > 0) {
    sections.push(report.assessments.map((a, i) => renderClaim(a, i, b)).join("\n\n---\n\n"));
  }

  if (trimmed) sections.push("_Some evidence was shortened to fit GitHub's comment size limit._");

  const models = report.models.length > 0 ? ` using ${report.models.map((m) => safeInline(m)).join(", ")}` : "";
  sections.push(
    `---\n<sub>Generated by Pramaan on ${report.generatedAt.slice(0, 10)}${models}. Verdicts come from code checks, not from the model. ` +
      "A maintainer makes the final decision; nothing was closed, labelled or changed on GitHub.</sub>",
  );

  return `${sections.join("\n\n")}\n`;
}

/** Ready-to-paste Markdown for a GitHub issue or pull request comment. Pramaan never posts it. */
export function renderGitHubComment(report: Report): string {
  let text = "";
  for (const [i, budget] of BUDGETS.entries()) {
    text = render(report, budget, i > 0);
    if (text.length <= BUDGET) return text;
  }
  return text;
}
