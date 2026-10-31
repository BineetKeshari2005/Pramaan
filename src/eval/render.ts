import { REFERENCE_LABELS } from "./dataset";
import { type EvalRow, type Metrics, PREDICTED_COLUMNS } from "./metrics";

const pct = (x: number | null) => (x === null ? "n/a" : `${(x * 100).toFixed(0)}%`);

export interface SummaryMeta {
  dataset: string;
  models: string[];
  generatedAt: string;
}

/** A Markdown summary of an evaluation run: headline numbers, the confusion matrix and per-case results. */
export function renderSummary(metrics: Metrics, rows: EvalRow[], meta: SummaryMeta): string {
  const lines: string[] = [];
  lines.push("# Pramaan evaluation results", "");
  lines.push(
    `Dataset: \`${meta.dataset}\` · ${metrics.total} closed issues · models: ${meta.models.join(", ") || "none"} · generated ${meta.generatedAt}`,
    "",
  );
  lines.push("Reference answers are the labels maintainers gave the issues when closing them. Pramaan never saw those labels.", "");

  lines.push("## Headline", "");
  lines.push("| Metric | Value |", "|---|---|");
  lines.push(`| Answered (gave invalid / cannot-reproduce / confirmed) | ${metrics.decided} of ${metrics.total} (${pct(metrics.coverage)}) |`);
  lines.push(`| Abstained (needs-info / needs-human-review) | ${metrics.abstained} (${pct(metrics.abstentionRate)}) |`);
  lines.push(`| Errors (could not run) | ${metrics.errors} |`);
  lines.push(`| Accuracy when it answered | ${pct(metrics.accuracyWhenDecided)} |`);
  lines.push(`| Accuracy over all cases (abstain = wrong) | ${pct(metrics.overallAccuracy)} |`);
  lines.push(`| Macro F1 over the three labels | ${metrics.macroF1 === null ? "n/a" : metrics.macroF1.toFixed(2)} |`);
  lines.push(`| **Real bugs dismissed as invalid** | **${metrics.realBugsDismissed}** |`);
  lines.push(`| Invalid reports labelled confirmed | ${metrics.invalidConfirmed} |`, "");

  lines.push("## Per label", "");
  lines.push("| Reference label | Cases | Predicted as this | Correct | Precision | Recall |", "|---|---|---|---|---|---|");
  for (const label of REFERENCE_LABELS) {
    const c = metrics.perClass[label];
    lines.push(`| ${label} | ${c.support} | ${c.predicted} | ${c.truePositives} | ${pct(c.precision)} | ${pct(c.recall)} |`);
  }
  lines.push("");

  lines.push("## Confusion matrix", "", "Rows: maintainers' label. Columns: Pramaan's suggested label.", "");
  lines.push(`| | ${PREDICTED_COLUMNS.join(" | ")} |`, `|---|${PREDICTED_COLUMNS.map(() => "---").join("|")}|`);
  for (const label of REFERENCE_LABELS) {
    lines.push(`| **${label}** | ${PREDICTED_COLUMNS.map((p) => metrics.confusion[label][p]).join(" | ")} |`);
  }
  lines.push("");

  lines.push("## Every case", "");
  lines.push("| Case | Maintainers | Pramaan | Time | Report |", "|---|---|---|---|---|");
  for (const r of rows) {
    const mark = r.predicted === r.reference ? "✅" : r.predicted === "error" ? "⚠️" : ["needs-info", "needs-human-review"].includes(r.predicted) ? "➖" : "❌";
    const report = r.predicted === "error" ? (r.error ?? "error").replace(/\|/g, "\\|").slice(0, 120) : `[json](reports/${r.id}.json) · [md](reports/${r.id}.md)`;
    lines.push(`| [${r.id}](${r.url}) | ${r.reference} | ${mark} ${r.predicted} | ${(r.durationMs / 1000).toFixed(0)}s | ${report} |`);
  }
  lines.push("", "✅ matches the maintainers · ➖ abstained (asked for more information or a human) · ❌ wrong label · ⚠️ could not run", "");
  return lines.join("\n");
}
