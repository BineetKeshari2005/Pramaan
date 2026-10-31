import { describe, expect, it } from "vitest";
import { ReportSchema } from "../../src/core/types";
import sampleReport from "../fixtures/reports/sample-report.json";

describe("sample-report.json", () => {
  it("passes ReportSchema.parse without throwing", () => {
    expect(() => ReportSchema.parse(sampleReport)).not.toThrow();
  });

  it("has the expected structure", () => {
    const report = ReportSchema.parse(sampleReport);
    expect(report.target.owner).toBe("acme-org");
    expect(report.target.repo).toBe("widget-engine");
    expect(report.target.number).toBe(42);
    expect(report.target.kind).toBe("issue");
    expect(report.assessments).toHaveLength(4);
  });

  it("covers all four verdicts", () => {
    const report = ReportSchema.parse(sampleReport);
    const verdicts = new Set(report.assessments.map((a) => a.verdict));
    expect(verdicts.has("reproduced")).toBe(true);
    expect(verdicts.has("contradicted")).toBe(true);
    expect(verdicts.has("not_reproduced")).toBe(true);
    expect(verdicts.has("insufficient_evidence")).toBe(true);
  });

  it("has at least one claim that needsHumanReview", () => {
    const report = ReportSchema.parse(sampleReport);
    const humanReview = report.assessments.filter((a) => a.needsHumanReview);
    expect(humanReview.length).toBeGreaterThan(0);
  });

  it("has at least one security_impact claim", () => {
    const report = ReportSchema.parse(sampleReport);
    const security = report.assessments.filter((a) => a.claim.type === "security_impact");
    expect(security.length).toBeGreaterThan(0);
  });

  it("has evidence with a permalink", () => {
    const report = ReportSchema.parse(sampleReport);
    const withPermalink = report.assessments.flatMap((a) =>
      a.evidence.filter((e) => e.location?.permalink),
    );
    expect(withPermalink.length).toBeGreaterThan(0);
  });

  it("has evidence with a log", () => {
    const report = ReportSchema.parse(sampleReport);
    const withLog = report.assessments.flatMap((a) =>
      a.evidence.filter((e) => e.log),
    );
    expect(withLog.length).toBeGreaterThan(0);
  });

  it("has triage label needs-human-review", () => {
    const report = ReportSchema.parse(sampleReport);
    expect(report.triage.label).toBe("needs-human-review");
  });
});
