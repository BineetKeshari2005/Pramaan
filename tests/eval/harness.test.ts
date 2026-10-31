import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Checkout, ExtractionResult, RepoRef, TargetDocument, TargetRef } from "../../src/core";
import { parseDataset } from "../../src/eval/dataset";
import { computeMetrics, type EvalRow } from "../../src/eval/metrics";
import { renderSummary } from "../../src/eval/render";
import { runEvaluation } from "../../src/eval/runner";
import { FakeExtractor, FakeGitHub, FakeVerifier, makeClaim, makeTarget } from "../fakes";

const row = (id: string, reference: EvalRow["reference"], predicted: EvalRow["predicted"]): EvalRow => ({
  id,
  url: `https://github.com/a/b/issues/${id.length}`,
  reference,
  predicted,
  durationMs: 1000,
});

describe("parseDataset", () => {
  const ok = { id: "sqlmap-6154", url: "https://github.com/sqlmapproject/sqlmap/issues/6154", reference: "invalid" };

  it("accepts { cases } or a bare array and keeps extra fields", () => {
    expect(parseDataset({ cases: [{ ...ok, language: "Python" }] })[0]).toMatchObject({ ...ok, language: "Python" });
    expect(parseDataset([ok])).toHaveLength(1);
  });

  it("rejects bad labels, bad URLs, unsafe ids and duplicates", () => {
    expect(() => parseDataset([{ ...ok, reference: "wontfix" }])).toThrow();
    expect(() => parseDataset([{ ...ok, url: "https://gitlab.com/a/b/issues/1" }])).toThrow(/github.com/);
    expect(() => parseDataset([{ ...ok, id: "../../etc" }])).toThrow(/slug/);
    expect(() => parseDataset([ok, ok])).toThrow(/Duplicate/);
  });
});

describe("computeMetrics", () => {
  const rows = [
    row("i1", "invalid", "invalid"),
    row("i2", "invalid", "needs-info"),
    row("i3", "invalid", "confirmed"),
    row("c1", "confirmed", "confirmed"),
    row("c2", "confirmed", "invalid"),
    row("c3", "confirmed", "needs-human-review"),
    row("r1", "cannot-reproduce", "cannot-reproduce"),
    row("r2", "cannot-reproduce", "error"),
  ];
  const m = computeMetrics(rows);

  it("builds the confusion matrix with abstentions and errors as their own columns", () => {
    expect(m.confusion.invalid).toMatchObject({ invalid: 1, "needs-info": 1, confirmed: 1 });
    expect(m.confusion["cannot-reproduce"].error).toBe(1);
  });

  it("separates answered, abstained and errored cases", () => {
    expect(m).toMatchObject({ total: 8, decided: 5, abstained: 2, errors: 1, correct: 3 });
    expect(m.abstentionRate).toBeCloseTo(2 / 8);
    expect(m.accuracyWhenDecided).toBeCloseTo(3 / 5);
    expect(m.overallAccuracy).toBeCloseTo(3 / 8);
  });

  it("computes precision and recall per label", () => {
    expect(m.perClass.invalid).toMatchObject({ support: 3, predicted: 2, truePositives: 1, precision: 0.5 });
    expect(m.perClass.invalid.recall).toBeCloseTo(1 / 3);
    expect(m.perClass.confirmed).toMatchObject({ support: 3, predicted: 2, truePositives: 1, precision: 0.5 });
    expect(m.perClass["cannot-reproduce"]).toMatchObject({ precision: 1, recall: 0.5 });
  });

  it("counts the harmful mistakes separately", () => {
    expect(m.realBugsDismissed).toBe(1);
    expect(m.invalidConfirmed).toBe(1);
  });

  it("reports undefined precision as null instead of a misleading zero", () => {
    expect(computeMetrics([row("x", "confirmed", "needs-info")]).perClass.confirmed.precision).toBeNull();
    expect(computeMetrics([]).accuracyWhenDecided).toBeNull();
  });

  it("renders a summary with the headline, matrix and every case", () => {
    const md = renderSummary(m, rows, { dataset: "d.json", models: ["gemma4:e2b-it-qat"], generatedAt: "2026-11-01T00:00:00Z" });
    expect(md).toContain("| **Real bugs dismissed as invalid** | **1** |");
    expect(md).toContain("| **invalid** | 1 | 1 | 0 | 1 | 0 | 0 |");
    expect(md).toContain("[json](reports/i1.json)");
    expect(md).toContain("⚠️ error");
  });
});

describe("runEvaluation", () => {
  let dir = "";
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  class ByNumberGitHub extends FakeGitHub {
    async fetchTarget(ref: TargetRef): Promise<TargetDocument> {
      if (ref.number === 3) throw new Error("GitHub issue not found: a/b#3");
      return makeTarget({ ref, url: `https://github.com/${ref.owner}/${ref.repo}/issues/${ref.number}` });
    }
    async checkout(_repo: RepoRef, commit?: string): Promise<Checkout> {
      return { dir: "/tmp/x", commit: commit ?? "0".repeat(40) };
    }
  }

  const extraction: ExtractionResult = { status: "ok", claims: [makeClaim({ id: "c1", type: "behavior" })], model: "gemma-test", attempts: 1 };
  const deps = () => ({
    github: new ByNumberGitHub(),
    extractor: new FakeExtractor(extraction),
    verifiers: [
      new FakeVerifier("static", {
        verdict: "contradicted",
        evidence: [{ kind: "static_proof", source: "static", summary: "`parse_url_v2` does not exist" }],
        missing: [],
      }),
    ],
  });
  const cases = [
    { id: "one", url: "https://github.com/a/b/issues/1", reference: "invalid" as const },
    { id: "two", url: "https://github.com/a/b/issues/2", reference: "confirmed" as const },
    { id: "three", url: "https://github.com/a/b/issues/3", reference: "cannot-reproduce" as const },
  ];

  it("runs every case, saves each real report, and keeps going after an error", async () => {
    dir = mkdtempSync(path.join(os.tmpdir(), "pramaan-eval-"));
    const { rows, metrics, models } = await runEvaluation(cases, deps(), { outDir: dir, datasetLabel: "test" });

    expect(rows.map((r) => r.predicted)).toEqual(["invalid", "invalid", "error"]);
    expect(rows[2]?.error).toContain("not found");
    expect(models).toEqual(["gemma-test"]);
    expect(metrics.realBugsDismissed).toBe(1);
    for (const f of ["reports/one.json", "reports/one.md", "reports/two.json", "results.json", "metrics.json", "SUMMARY.md"]) {
      expect(existsSync(path.join(dir, f)), f).toBe(true);
    }
    expect(existsSync(path.join(dir, "reports/three.json"))).toBe(false);
    expect(readFileSync(path.join(dir, "reports/one.md"), "utf8")).toContain("Pramaan evidence report");
  });

  it("resumes from saved reports instead of re-running them", async () => {
    dir = mkdtempSync(path.join(os.tmpdir(), "pramaan-eval-"));
    await runEvaluation(cases.slice(0, 1), deps(), { outDir: dir, datasetLabel: "test" });
    const failing = { ...deps(), extractor: { extract: async () => Promise.reject(new Error("must not run")) } };
    const { rows } = await runEvaluation(cases.slice(0, 1), failing, { outDir: dir, datasetLabel: "test" });
    expect(rows[0]?.predicted).toBe("invalid");
  });
});
