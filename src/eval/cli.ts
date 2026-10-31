import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import { createDeps } from "../cli/deps";
import { loadDataset } from "./dataset";
import { runEvaluation } from "./runner";

const USAGE = `Usage: npm run eval -- <dataset.json> [options]

Runs Pramaan on every labelled closed issue and writes real reports plus metrics.

Options:
  --out <dir>     Output directory (default: examples/eval)
  --only <ids>    Comma-separated case ids to run
  --limit <n>     Run only the first n cases
  --fresh         Re-run cases that already have a saved report`;

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      out: { type: "string" },
      only: { type: "string" },
      limit: { type: "string" },
      fresh: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
  const file = positionals[0];
  if (values.help || !file) {
    console.log(USAGE);
    return file || values.help ? 0 : 1;
  }

  let cases = loadDataset(file);
  if (values.only) {
    const ids = new Set(values.only.split(",").map((s) => s.trim()));
    cases = cases.filter((c) => ids.has(c.id));
  }
  if (values.limit) cases = cases.slice(0, Math.max(0, Number(values.limit)));
  if (cases.length === 0) throw new Error("No cases selected");

  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const outDir = values.out ?? "examples/eval";
  console.error(`Running ${cases.length} case(s) from ${file} → ${outDir}`);
  const { metrics, bestGuessMetrics } = await runEvaluation(cases, createDeps(), {
    outDir,
    datasetLabel: file,
    fresh: values.fresh,
    log: (l) => console.error(l),
  });
  const pct = (x: number | null) => (x === null ? "n/a" : `${(x * 100).toFixed(0)}%`);
  console.error(
    `\nCommitted: answered ${metrics.decided}/${metrics.total} · abstained ${pct(metrics.abstentionRate)} · accuracy when answered ${pct(metrics.accuracyWhenDecided)} · real bugs dismissed ${metrics.realBugsDismissed}`,
  );
  console.error(
    `Best guess: accuracy ${pct(bestGuessMetrics.overallAccuracy)} (${bestGuessMetrics.correct}/${bestGuessMetrics.total}) · real bugs dismissed ${bestGuessMetrics.realBugsDismissed}`,
  );
  console.error(`Summary: ${outDir}/SUMMARY.md`);
  return 0;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err: Error) => {
    console.error(`pramaan eval: ${err.message}`);
    process.exit(1);
  },
);
