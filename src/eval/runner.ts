import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  type BestGuessLabel,
  bestGuess,
  type ClaimExtractor,
  type PipelineDeps,
  type Report,
  ReportSchema,
  parseTargetUrl,
  runPipeline,
  type TriageLabel,
} from "../core";
import { renderReportMarkdown } from "../core/report";
import type { EvalCase } from "./dataset";
import { asBestGuessRows, computeMetrics, type EvalRow, majorityBaseline, type Metrics } from "./metrics";
import { renderSummary } from "./render";

export interface RunOptions {
  outDir: string;
  datasetLabel: string;
  /** Re-run cases that already have a saved report (default: reuse them, so a long run can resume). */
  fresh?: boolean;
  /**
   * Directory of an earlier run: reuse the claims it extracted (no model calls) and redo only
   * checkout, verification and grading. Isolates the effect of verifier or grading changes.
   */
  reverifyFrom?: string;
  log?: (line: string) => void;
  now?: () => Date;
}

/** An extractor that returns the claims an earlier run extracted for this case. */
function savedClaimsExtractor(saved: Report): ClaimExtractor {
  return {
    extract: async () =>
      saved.extraction.status === "ok"
        ? { status: "ok", claims: saved.assessments.map((a) => a.claim), model: saved.models[0] ?? "", attempts: 1 }
        : { status: "abstained", reason: saved.extraction.reason, model: saved.models[0] ?? "", attempts: 1 },
  };
}

export interface RunResult {
  rows: EvalRow[];
  /** Scored on the committed label (abstentions count as not answered). */
  metrics: Metrics;
  /** Scored on the forced-choice best guess. */
  bestGuessMetrics: Metrics;
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
      // Grading-only fields are recomputed from the saved claims and evidence; the model is not re-run.
      const guess = saved.triage.bestGuess ?? bestGuess(saved.triage.label, saved.extraction.status === "ok", saved.assessments);
      writeFileSync(path.join(reportsDir, `${c.id}.md`), renderReportMarkdown({ ...saved, triage: { ...saved.triage, bestGuess: guess } }));
      const previous = previousRows.find((r) => r.id === c.id);
      rows.push(rowFor(c, saved.triage.label, guess, previous?.durationMs ?? 0));
      log(`${prefix}: reused saved report → ${saved.triage.label} (best guess ${guess.label})`);
      continue;
    }

    const started = Date.now();
    try {
      let caseDeps = deps;
      if (options.reverifyFrom) {
        const earlier = path.join(options.reverifyFrom, "reports", `${c.id}.json`);
        const saved = ReportSchema.parse(JSON.parse(readFileSync(earlier, "utf8")));
        caseDeps = { ...deps, extractor: savedClaimsExtractor(saved) };
      }
      const report = await runPipeline(parseTargetUrl(c.url), caseDeps, { commit: c.commit });
      writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
      writeFileSync(path.join(reportsDir, `${c.id}.md`), renderReportMarkdown(report));
      report.models.forEach((m) => models.add(m));
      const guess = report.triage.bestGuess ?? bestGuess(report.triage.label, report.extraction.status === "ok", report.assessments);
      rows.push(rowFor(c, report.triage.label, guess, Date.now() - started));
      log(`${prefix}: ${report.triage.label}, best guess ${guess.label} (maintainers: ${c.reference}) in ${((Date.now() - started) / 1000).toFixed(0)}s`);
    } catch (err) {
      const message = (err as Error).message.split("\n")[0] ?? "unknown error";
      rows.push({ id: c.id, url: c.url, reference: c.reference, predicted: "error", durationMs: Date.now() - started, error: message });
      log(`${prefix}: ERROR ${message}`);
    }
    // Save after every case so an interrupted run keeps its progress.
    writeFileSync(path.join(options.outDir, "results.json"), `${JSON.stringify(rows, null, 2)}\n`);
  }

  const metrics = computeMetrics(rows);
  const bestGuessMetrics = computeMetrics(asBestGuessRows(rows));
  const baseline = majorityBaseline(rows);
  writeFileSync(path.join(options.outDir, "results.json"), `${JSON.stringify(rows, null, 2)}\n`);
  writeFileSync(
    path.join(options.outDir, "metrics.json"),
    `${JSON.stringify({ strict: metrics, bestGuess: bestGuessMetrics, majorityBaseline: baseline }, null, 2)}\n`,
  );
  writeFileSync(
    path.join(options.outDir, "SUMMARY.md"),
    renderSummary(metrics, rows, {
      dataset: options.datasetLabel,
      models: [...models],
      generatedAt: now().toISOString(),
      bestGuess: bestGuessMetrics,
      baseline,
    }),
  );
  return { rows, metrics, bestGuessMetrics, models: [...models] };
}

function rowFor(c: EvalCase, predicted: TriageLabel, guess: { label: BestGuessLabel; rule: string }, durationMs: number): EvalRow {
  return { id: c.id, url: c.url, reference: c.reference, predicted, bestGuess: guess.label, bestGuessRule: guess.rule, durationMs };
}

function readPreviousRows(outDir: string): EvalRow[] {
  try {
    return JSON.parse(readFileSync(path.join(outDir, "results.json"), "utf8")) as EvalRow[];
  } catch {
    return [];
  }
}
