import { REFERENCE_LABELS, type ReferenceLabel } from "./dataset";
import { type EvalRow, type Metrics, PREDICTED_COLUMNS } from "./metrics";

const pct = (x: number | null) => (x === null ? "n/a" : `${(x * 100).toFixed(0)}%`);

export interface SummaryMeta {
  dataset: string;
  models: string[];
  generatedAt: string;
  /** Metrics scored on the forced-choice best guess. */
  bestGuess?: Metrics;
  /** Accuracy of always answering the most common label. */
  baseline?: { label: ReferenceLabel; accuracy: number };
}

function perLabel(metrics: Metrics): string[] {
  const lines = ["| Reference label | Cases | Predicted as this | Correct | Precision | Recall |", "|---|---|---|---|---|---|"];
  for (const label of REFERENCE_LABELS) {
    const c = metrics.perClass[label];
    lines.push(`| ${label} | ${c.support} | ${c.predicted} | ${c.truePositives} | ${pct(c.precision)} | ${pct(c.recall)} |`);
  }
  return lines;
}

function confusion(metrics: Metrics, columns = PREDICTED_COLUMNS): string[] {
  const lines = [`| | ${columns.join(" | ")} |`, `|---|${columns.map(() => "---").join("|")}|`];
  for (const label of REFERENCE_LABELS) {
    lines.push(`| **${label}** | ${columns.map((p) => metrics.confusion[label][p]).join(" | ")} |`);
  }
  return lines;
}

/** A Markdown summary of an evaluation run: headline numbers, the confusion matrices and per-case results. */
export function renderSummary(metrics: Metrics, rows: EvalRow[], meta: SummaryMeta): string {
  const lines: string[] = [];
  lines.push("# Pramaan evaluation results", "");
  lines.push(
    `Dataset: \`${meta.dataset}\` · ${metrics.total} closed issues · models: ${meta.models.join(", ") || "none"} · generated ${meta.generatedAt}`,
    "",
  );
  lines.push("Reference answers are the labels maintainers gave the issues when closing them. Pramaan never saw those labels.", "");
  lines.push(
    "Pramaan reports two labels. The **committed label** is given only when code checks settle it (code that does not exist, or a reproduction that ran); otherwise it abstains with needs-info or needs-human-review. The **best guess** is the closest label when forced to choose, from fixed evidence rules, and is shown to maintainers as a guess.",
    "",
  );

  lines.push("## Committed label", "");
  lines.push("| Metric | Value |", "|---|---|");
  lines.push(`| Answered (gave invalid / cannot-reproduce / confirmed) | ${metrics.decided} of ${metrics.total} (${pct(metrics.coverage)}) |`);
  lines.push(`| Abstained (needs-info / needs-human-review) | ${metrics.abstained} (${pct(metrics.abstentionRate)}) |`);
  lines.push(`| Errors (could not run) | ${metrics.errors} |`);
  lines.push(`| Accuracy when it answered | ${pct(metrics.accuracyWhenDecided)} |`);
  lines.push(`| Accuracy over all cases (abstain = wrong) | ${pct(metrics.overallAccuracy)} |`);
  lines.push(`| Macro F1 over the three labels | ${metrics.macroF1 === null ? "n/a" : metrics.macroF1.toFixed(2)} |`);
  lines.push(`| **Real bugs dismissed as invalid** | **${metrics.realBugsDismissed}** |`);
  lines.push(`| Invalid reports labelled confirmed | ${metrics.invalidConfirmed} |`, "");
  lines.push(...perLabel(metrics), "");
  lines.push("Rows: maintainers' label. Columns: Pramaan's committed label.", "", ...confusion(metrics), "");

  if (meta.bestGuess) {
    const g = meta.bestGuess;
    lines.push("## Best guess (forced to choose)", "");
    lines.push("| Metric | Value |", "|---|---|");
    lines.push(`| Accuracy over all cases | ${pct(g.overallAccuracy)} (${g.correct} of ${g.total}) |`);
    if (meta.baseline) {
      lines.push(`| Baseline: always answer "${meta.baseline.label}" | ${pct(meta.baseline.accuracy)} |`);
    }
    lines.push(`| Macro F1 over the three labels | ${g.macroF1 === null ? "n/a" : g.macroF1.toFixed(2)} |`);
    lines.push(`| **Real bugs dismissed as invalid** | **${g.realBugsDismissed}** |`);
    lines.push(`| Invalid reports labelled confirmed | ${g.invalidConfirmed} |`, "");
    lines.push(...perLabel(g), "");
    lines.push("Rows: maintainers' label. Columns: Pramaan's best guess.", "", ...confusion(g, ["confirmed", "invalid", "cannot-reproduce", "error"]), "");
  }

  lines.push("## Every case", "");
  lines.push("| Case | Maintainers | Committed | Best guess | Why (best guess) | Time | Report |", "|---|---|---|---|---|---|---|");
  for (const r of rows) {
    const mark = (p: string) =>
      p === r.reference ? "✅" : p === "error" ? "⚠️" : ["needs-info", "needs-human-review"].includes(p) ? "➖" : "❌";
    const guess = r.bestGuess ?? r.predicted;
    const why = (r.bestGuessRule ?? "").replace(/\|/g, "\\|");
    const report = r.predicted === "error" ? (r.error ?? "error").replace(/\|/g, "\\|").slice(0, 120) : `[json](reports/${r.id}.json) · [md](reports/${r.id}.md)`;
    lines.push(
      `| [${r.id}](${r.url}) | ${r.reference} | ${mark(r.predicted)} ${r.predicted} | ${mark(guess)} ${guess} | ${why} | ${(r.durationMs / 1000).toFixed(0)}s | ${report} |`,
    );
  }
  lines.push("", "✅ matches the maintainers · ➖ abstained (asked for more information or a human) · ❌ wrong label · ⚠️ could not run", "");
  return lines.join("\n");
}
