import type { TriageLabel } from "../core/types";
import { REFERENCE_LABELS, type ReferenceLabel } from "./dataset";

export type Predicted = TriageLabel | "error";

/** Every column of the confusion matrix: the three answers, the two ways of abstaining, and errors. */
export const PREDICTED_COLUMNS: Predicted[] = [
  "confirmed",
  "invalid",
  "cannot-reproduce",
  "needs-info",
  "needs-human-review",
  "error",
];
const ABSTAIN = new Set<Predicted>(["needs-info", "needs-human-review"]);

export interface EvalRow {
  id: string;
  url: string;
  reference: ReferenceLabel;
  predicted: Predicted;
  durationMs: number;
  error?: string;
}

export interface ClassMetrics {
  support: number;
  predicted: number;
  truePositives: number;
  /** null when the tool never predicted this class (undefined, not zero). */
  precision: number | null;
  /** null when the dataset has no case of this class. */
  recall: number | null;
}

export interface Metrics {
  total: number;
  /** Cases where the tool gave one of the three reference answers. */
  decided: number;
  abstained: number;
  errors: number;
  correct: number;
  coverage: number;
  abstentionRate: number;
  /** Correct answers among the cases where the tool committed to an answer. */
  accuracyWhenDecided: number | null;
  /** Correct answers over all cases; abstentions and errors count as not correct. */
  overallAccuracy: number;
  macroF1: number | null;
  perClass: Record<ReferenceLabel, ClassMetrics>;
  confusion: Record<ReferenceLabel, Record<Predicted, number>>;
  /** Real bugs (reference "confirmed") that the tool labelled "invalid": the most harmful mistake. */
  realBugsDismissed: number;
  /** Invalid reports the tool labelled "confirmed". */
  invalidConfirmed: number;
}

const ratio = (a: number, b: number) => (b === 0 ? null : a / b);

export function computeMetrics(rows: EvalRow[]): Metrics {
  const confusion = Object.fromEntries(
    REFERENCE_LABELS.map((r) => [r, Object.fromEntries(PREDICTED_COLUMNS.map((p) => [p, 0]))]),
  ) as Record<ReferenceLabel, Record<Predicted, number>>;
  for (const row of rows) confusion[row.reference][row.predicted]++;

  const perClass = Object.fromEntries(
    REFERENCE_LABELS.map((label) => {
      const support = rows.filter((r) => r.reference === label).length;
      const predicted = rows.filter((r) => r.predicted === label).length;
      const truePositives = confusion[label][label];
      return [label, { support, predicted, truePositives, precision: ratio(truePositives, predicted), recall: ratio(truePositives, support) }];
    }),
  ) as Record<ReferenceLabel, ClassMetrics>;

  const f1s = REFERENCE_LABELS.map((l) => perClass[l]).filter((c) => c.support > 0).map((c) => {
    const p = c.precision ?? 0;
    const r = c.recall ?? 0;
    return p + r === 0 ? 0 : (2 * p * r) / (p + r);
  });

  const total = rows.length;
  const decided = rows.filter((r) => (REFERENCE_LABELS as readonly string[]).includes(r.predicted)).length;
  const abstained = rows.filter((r) => ABSTAIN.has(r.predicted)).length;
  const errors = rows.filter((r) => r.predicted === "error").length;
  const correct = rows.filter((r) => r.predicted === r.reference).length;

  return {
    total,
    decided,
    abstained,
    errors,
    correct,
    coverage: total === 0 ? 0 : decided / total,
    abstentionRate: total === 0 ? 0 : abstained / total,
    accuracyWhenDecided: ratio(correct, decided),
    overallAccuracy: total === 0 ? 0 : correct / total,
    macroF1: f1s.length === 0 ? null : f1s.reduce((a, b) => a + b, 0) / f1s.length,
    perClass,
    confusion,
    realBugsDismissed: confusion.confirmed.invalid,
    invalidConfirmed: confusion.invalid.confirmed,
  };
}
