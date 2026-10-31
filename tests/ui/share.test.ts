import { describe, expect, it } from "vitest";
import { renderReportMarkdown } from "../../src/core/report";
import { type Report, ReportSchema } from "../../src/core/types";
import { issueCommentUrl, shareContent } from "../../src/app/lib/share";
import abstainedData from "../fixtures/reports/abstained-report.json";
import adversarialData from "../fixtures/reports/adversarial-report.json";
import sampleData from "../fixtures/reports/sample-report.json";

describe("shareContent", () => {
  const sampleReport = ReportSchema.parse(sampleData);
  const abstainedReport = ReportSchema.parse(abstainedData);
  const adversarialReport = ReportSchema.parse(adversarialData);

  it("returns the exact same markdown as renderReportMarkdown", () => {
    expect(shareContent(sampleReport).markdown).toBe(renderReportMarkdown(sampleReport));
    expect(shareContent(abstainedReport).markdown).toBe(renderReportMarkdown(abstainedReport));
    expect(shareContent(adversarialReport).markdown).toBe(renderReportMarkdown(adversarialReport));
  });

  it("returns reply and empty replyReason for a report that needs a reply", () => {
    const result = shareContent(sampleReport);
    expect(result.reply).not.toBeNull();
    expect(typeof result.reply).toBe("string");
    expect(result.replyReason).toBe("");
  });

  it("returns null reply and expected replyReason for a report with no open questions", () => {
    const fullySettledReport: Report = ReportSchema.parse({
      target: {
        owner: "acme-org",
        repo: "widget-engine",
        number: 10,
        kind: "issue",
        url: "https://github.com/acme-org/widget-engine/issues/10",
        title: "Verified issue",
        commit: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
      },
      generatedAt: "2026-11-01T00:00:00.000Z",
      models: [],
      extraction: {
        status: "ok",
        claimCount: 1,
      },
      assessments: [
        {
          claim: {
            id: "c-1",
            type: "behavior",
            statement: "The render method returns a container element",
            quote: "The render method returns a container element",
            references: {
              files: ["src/widget.ts"],
              symbols: ["render"],
              lines: [{ file: "src/widget.ts", line: 42 }],
              versions: [],
            },
            evidenceProvided: ["repro_steps"],
          },
          verdict: "reproduced",
          confidence: "high",
          evidence: [
            {
              kind: "executed_repro",
              source: "sandbox",
              summary: "Observed container return value",
            },
          ],
          missing: [],
          needsHumanReview: false,
        },
      ],
      triage: {
        label: "confirmed",
        rationale: "All claims were reproduced with high confidence.",
      },
    });

    const result = shareContent(fullySettledReport);
    expect(result.reply).toBeNull();
    expect(result.replyReason).toBe(
      "No questions for the reporter: every checkable claim was settled.",
    );
  });
});

describe("issueCommentUrl", () => {
  it("appends #issuecomment-new for an issue", () => {
    const issueReport: Report = ReportSchema.parse({
      ...sampleData,
      target: {
        ...sampleData.target,
        kind: "issue",
        url: "https://github.com/acme-org/widget-engine/issues/42",
      },
    });

    expect(issueCommentUrl(issueReport)).toBe(
      "https://github.com/acme-org/widget-engine/issues/42#issuecomment-new",
    );
  });

  it("appends #issuecomment-new for a pull request", () => {
    const prReport: Report = ReportSchema.parse({
      ...sampleData,
      target: {
        ...sampleData.target,
        kind: "pull",
        url: "https://github.com/acme-org/widget-engine/pull/99",
      },
    });

    expect(issueCommentUrl(prReport)).toBe(
      "https://github.com/acme-org/widget-engine/pull/99#issuecomment-new",
    );
  });
});
