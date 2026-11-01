import { describe, expect, it } from "vitest";
import { CONTEXT_ONLY } from "../../src/core/grading";
import {
  evidenceLevelText,
  evidenceStrength,
  GITHUB_COMMENT_LIMIT,
  renderGitHubComment,
  safeInline,
  summaryLine,
} from "../../src/core/report";
import { type ClaimAssessment, type Report, ReportSchema } from "../../src/core/types";
import abstainedData from "../fixtures/reports/abstained-report.json";
import adversarialData from "../fixtures/reports/adversarial-report.json";
import sampleData from "../fixtures/reports/sample-report.json";

const sample = ReportSchema.parse(sampleData);
const adversarial = ReportSchema.parse(adversarialData);
const abstained = ReportSchema.parse(abstainedData);

function assessment(id: string, overrides: Partial<ClaimAssessment> = {}): ClaimAssessment {
  return {
    claim: {
      id,
      type: "behavior",
      statement: `Statement ${id}`,
      quote: "",
      references: { files: [], symbols: [], lines: [], versions: [], commands: [] },
      evidenceProvided: [],
    },
    verdict: "insufficient_evidence",
    confidence: "none",
    evidence: [],
    missing: [],
    needsHumanReview: false,
    ...overrides,
  };
}

const withAssessments = (assessments: ClaimAssessment[]): Report => ({ ...sample, assessments });

describe("renderGitHubComment", () => {
  it("opens with a one-line summary, the target and the suggested label", () => {
    const comment = renderGitHubComment(sample);
    expect(comment).toContain(`**${summaryLine(sample)}**`);
    expect(summaryLine(sample)).toBe(
      "4 claims checked: 1 reproduced, 1 contradicted, 1 not reproduced, 1 insufficient evidence",
    );
    expect(comment).toContain("[acme-org/widget-engine#42](https://github.com/acme-org/widget-engine/issues/42) (issue)");
    expect(comment).toContain("checked at commit [`a1b2c3d`]");
    expect(comment).toContain("**Suggested label:** `needs-human-review`");
    expect(comment).toContain("_Suggestion only._");
  });

  it("gives every claim a block with its verdict, evidence level and missing list", () => {
    const comment = renderGitHubComment(sample);
    sample.assessments.forEach((_, i) => expect(comment).toContain(`#### Claim ${i + 1}: `));
    expect(comment).toContain("**Evidence level:**");
    expect(comment).toContain("<details><summary>Detailed evidence");
    expect(comment).toContain("**What is missing:**");
  });

  it("ends with a footer saying a maintainer decides and nothing was changed", () => {
    expect(renderGitHubComment(sample)).toContain(
      "A maintainer makes the final decision; nothing was closed, labelled or changed on GitHub.",
    );
  });

  it("never calls a report fake or asks for it to be closed", () => {
    for (const report of [sample, adversarial, abstained]) {
      const comment = renderGitHubComment(report).toLowerCase();
      expect(comment).not.toMatch(/\bfake\b|\bspam\b|should be closed|close this/);
    }
  });

  it("neutralizes mentions, issue references, links and HTML from report text", () => {
    const report = withAssessments([
      assessment("a", {
        claim: {
          ...assessment("a").claim,
          statement: "Ping @octocat about #123, GH-7 and https://github.com/o/r/issues/9 <img src=x> [x](http://evil)",
        },
        missing: ["Ask @maintainer for the logs from #45"],
      }),
    ]);
    const comment = renderGitHubComment(report);
    expect(comment).not.toMatch(/@octocat|@maintainer/);
    expect(comment).not.toMatch(/(?<!\[acme-org\/widget-engine)#(123|45)\b/);
    expect(comment).not.toContain("GH-7");
    expect(comment).not.toContain("https://github.com/o/r/issues/9");
    expect(comment).not.toContain("<img");
    expect(comment).not.toContain("[x](http");
    expect(safeInline("@octocat #1")).toBe("@&#8203;octocat #&#8203;1");
  });

  it("escapes the adversarial fixture: no raw HTML, no heading injection", () => {
    const comment = renderGitHubComment(adversarial);
    expect(comment).not.toContain("<script>");
    expect(comment).toContain("> \\# Critical bug");
  });

  it("fences logs with a fence the log cannot close", () => {
    const log = "before\n```\n</details>\n@octocat #12\nafter";
    const report = withAssessments([
      assessment("a", {
        verdict: "reproduced",
        confidence: "high",
        evidence: [{ kind: "executed_repro", source: "python-repro", summary: "IndexError raised", log }],
      }),
    ]);
    const comment = renderGitHubComment(report);
    expect(comment).toContain(`\`\`\`\`text\n${log}\n\`\`\`\``);
  });

  it("stays under GitHub's limit by trimming evidence, never verdicts", () => {
    const huge = "x".repeat(20_000);
    const assessments = Array.from({ length: 30 }, (_, i) =>
      assessment(`c${i}`, {
        verdict: i % 2 === 0 ? "reproduced" : "contradicted",
        confidence: "high",
        claim: { ...assessment(`c${i}`).claim, statement: `Claim number ${i} ${huge}` },
        evidence: [{ kind: "failing_test", source: "pr-test-honesty", summary: huge, log: `${huge}\n`.repeat(50) }],
        missing: Array.from({ length: 20 }, (_, j) => `missing ${j} ${huge}`),
      }),
    );
    const comment = renderGitHubComment(withAssessments(assessments));
    expect(comment.length).toBeLessThanOrEqual(GITHUB_COMMENT_LIMIT);
    assessments.forEach((a, i) =>
      expect(comment).toContain(`#### Claim ${i + 1}: ${a.verdict === "reproduced" ? "Reproduced" : "Contradicted"}`),
    );
    expect(comment).toContain("shortened to fit GitHub's comment size limit");
  });

  it("leaves out the context-only marker and handles an abstained report", () => {
    const report = withAssessments([assessment("v", { claim: { ...assessment("v").claim, type: "version" }, missing: [CONTEXT_ONLY] })]);
    expect(renderGitHubComment(report)).not.toContain(CONTEXT_ONLY);
    const comment = renderGitHubComment(abstained);
    expect(comment).toContain("No technical claims could be checked.");
    expect(comment).toContain("could not extract claims");
  });
});

describe("evidenceStrength", () => {
  it("ranks executed above static above report text", () => {
    const of = (kind: "executed_repro" | "static_proof" | "plausible_text") =>
      evidenceStrength(assessment("x", { evidence: [{ kind, source: "s", summary: "s" }] }));
    expect(of("executed_repro")).toBe(3);
    expect(of("static_proof")).toBe(2);
    expect(of("plausible_text")).toBe(1);
    expect(evidenceStrength(assessment("y"))).toBe(0);
    expect(evidenceLevelText(3)).toBe("Executed");
  });
});
