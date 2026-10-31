import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { type PipelineDeps, ReportSchema, parseTargetUrl, runPipeline } from "../core";
import { renderReportMarkdown } from "../core/report";
import type { EvalCase } from "./dataset";
import { computeMetrics, type EvalRow, type Metrics } from "./metrics";
import { renderSummary } from "./render";

export interface RunOptions {
  outDir: string;
  datasetLabel: string;
  /** Re-run cases that already have a saved report (default: reuse them, so a long run can resume). */
  fresh?: boolean;
  log?: (line: string) => void;
  now?: () => Date;
}

export interface RunResult {
  rows: EvalRow[];
  metrics: Metrics;
  models: string[];
}

/**
 * Runs the real pipeline on every case and writes, under outDir:
 *   reports/<id>.json and reports/<id>.md   the full report Pramaan produced for that issue
 *   results.json                            one row per case: reference vs. predicted label
 *   metrics.json and SUMMARY.md             confusion matrix, precision/recall, abstention rate
 * Every report is the tool's real output; nothing here edits or fills in results.
 */
export async function runEvaluation(cases: EvalCase[], deps: PipelineDeps, options: RunOptions): Promise<RunResult> {
  const log = options.log ?? (() => {});
  const now = options.now ?? (() => new Date());
  const reportsDir = path.join(options.outDir, "reports");
  mkdirSync(reportsDir, { recursive: true });

  const previousRows = readPreviousRows(options.outDir);
  const rows: EvalRow[] = [];
  const models = new Set<string>();
  for (const [i, c] of cases.entries()) {
    const jsonPath = path.join(reportsDir, `${c.id}.json`);
    const prefix = `[${i + 1}/${cases.length}] ${c.id}`;
    if (!options.fresh && existsSync(jsonPath)) {
      const saved = ReportSchema.parse(JSON.parse(readFileSync(jsonPath, "utf8")));
      saved.models.forEach((m) => models.add(m));
      const previous = previousRows.find((r) => r.id === c.id);
      rows.push({ id: c.id, url: c.url, reference: c.reference, predicted: saved.triage.label, durationMs: previous?.durationMs ?? 0 });
      log(`${prefix}: reused saved report → ${saved.triage.label}`);
      continue;
    }

    const started = Date.now();
    try {
      const report = await runPipeline(parseTargetUrl(c.url), deps, { commit: c.commit });
      writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
      writeFileSync(path.join(reportsDir, `${c.id}.md`), renderReportMarkdown(report));
      report.models.forEach((m) => models.add(m));
      rows.push({ id: c.id, url: c.url, reference: c.reference, predicted: report.triage.label, durationMs: Date.now() - started });
      log(`${prefix}: ${report.triage.label} (maintainers: ${c.reference}) in ${((Date.now() - started) / 1000).toFixed(0)}s`);
    } catch (err) {
      const message = (err as Error).message.split("\n")[0] ?? "unknown error";
      rows.push({ id: c.id, url: c.url, reference: c.reference, predicted: "error", durationMs: Date.now() - started, error: message });
      log(`${prefix}: ERROR ${message}`);
    }
    // Save after every case so an interrupted run keeps its progress.
    writeFileSync(path.join(options.outDir, "results.json"), `${JSON.stringify(rows, null, 2)}\n`);
  }

  const metrics = computeMetrics(rows);
  writeFileSync(path.join(options.outDir, "results.json"), `${JSON.stringify(rows, null, 2)}\n`);
  writeFileSync(path.join(options.outDir, "metrics.json"), `${JSON.stringify(metrics, null, 2)}\n`);
  writeFileSync(
    path.join(options.outDir, "SUMMARY.md"),
    renderSummary(metrics, rows, { dataset: options.datasetLabel, models: [...models], generatedAt: now().toISOString() }),
  );
  return { rows, metrics, models: [...models] };
}

function readPreviousRows(outDir: string): EvalRow[] {
  try {
    return JSON.parse(readFileSync(path.join(outDir, "results.json"), "utf8")) as EvalRow[];
  } catch {
    return [];
  }
}
