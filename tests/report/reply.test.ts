import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CONTEXT_ONLY } from "../../src/core/grading";
import { buildReporterReply } from "../../src/core/report/reply";
import { ReportSchema, type Report } from "../../src/core/types";

const fixturesDir = join(__dirname, "../fixtures/reports");

function loadReport(filename: string): Report {
  const raw = readFileSync(join(fixturesDir, filename), "utf8");
  return ReportSchema.parse(JSON.parse(raw));
}

function makeReport(overrides: Partial<Report>): Report {
  const base = loadReport("sample-report.json");
  return ReportSchema.parse({
    ...base,
    ...overrides,
  });
}

describe("buildReporterReply", () => {
  it("returns null for a confirmed report with nothing missing", () => {
    const report = makeReport({
      triage: { label: "confirmed", rationale: "Fully confirmed" },
      assessments: [
        {
          claim: {
            id: "c1",
            type: "behavior",
            statement: "Function foo returns 42",
            quote: "foo returns 42",
            references: { files: [], symbols: [], lines: [], versions: [], commands: [] },
            evidenceProvided: ["repro_steps", "stack_trace"],
          },
          verdict: "reproduced",
          confidence: "high",
          needsHumanReview: false,
          evidence: [],
          missing: [],
        },
      ],
    });

    expect(buildReporterReply(report)).toBeNull();
  });

  it("returns null for an invalid report with nothing missing", () => {
    const report = makeReport({
      triage: { label: "invalid", rationale: "User error" },
      assessments: [
        {
          claim: {
            id: "c1",
            type: "behavior",
            statement: "Function foo returns 42",
            quote: "foo returns 42",
            references: { files: [], symbols: [], lines: [], versions: [], commands: [] },
            evidenceProvided: ["repro_steps"],
          },
          verdict: "contradicted",
          confidence: "high",
          needsHumanReview: false,
          evidence: [],
          missing: [],
        },
      ],
    });

    expect(buildReporterReply(report)).toBeNull();
  });

  it("does not ask for a version the reporter already gave, and leaves context claims out", () => {
    const report = makeReport({
      triage: { label: "needs-info", rationale: "Need more" },
      assessments: [
        {
          claim: {
            id: "c1",
            type: "version",
            statement: "The Python version is 3.14.7.",
            quote: "Python version: 3.14.7",
            references: { files: [], symbols: [], lines: [], versions: ["3.14.7"], commands: [] },
            evidenceProvided: [],
          },
          verdict: "insufficient_evidence",
          confidence: "none",
          needsHumanReview: false,
          evidence: [],
          missing: [CONTEXT_ONLY],
        },
        {
          claim: {
            id: "c2",
            type: "behavior",
            statement: "Saving a widget raises KeyError.",
            quote: "raises KeyError",
            references: { files: [], symbols: [], lines: [], versions: [], commands: [] },
            evidenceProvided: ["stack_trace", "repro_steps"],
          },
          verdict: "insufficient_evidence",
          confidence: "low",
          needsHumanReview: true,
          evidence: [],
          missing: ["The crash itself was not reproduced."],
        },
      ],
    });
    const reply = buildReporterReply(report) ?? "";
    expect(reply).not.toContain("exact version");
    expect(reply).not.toContain("The Python version is 3.14.7.");
    expect(reply).not.toContain(CONTEXT_ONLY);
    expect(reply).toContain("Saving a widget raises KeyError.");
  });

  it("asks for the exact version when the report gives none", () => {
    const report = makeReport({
      target: {
        owner: "acme",
        repo: "widgets",
        number: 1,
        kind: "issue",
        url: "https://github.com/acme/widgets/issues/1",
        title: "Test",
        commit: null, // commit is null
      },
      triage: { label: "needs-info", rationale: "Need version info" },
      assessments: [
        {
          claim: {
            id: "c1",
            type: "behavior",
            statement: "The export button does nothing",
            quote: "export button does nothing",
            references: { files: [], symbols: [], lines: [], versions: [], commands: [] },
            evidenceProvided: ["logs"],
          },
          verdict: "insufficient_evidence",
          confidence: "low",
          needsHumanReview: false,
          evidence: [],
          missing: ["Version history"],
        },
      ],
    });

    const reply = buildReporterReply(report);
    expect(reply).not.toBeNull();
    expect(reply).toContain("exact version");
  });

  it("triggers repro steps and stack trace requests for behavior claims without evidence", () => {
    const report = makeReport({
      triage: { label: "needs-info", rationale: "Missing repro" },
      assessments: [
        {
          claim: {
            id: "c1",
            type: "behavior",
            statement: "Crash with exception when clicking button",
            quote: "it crashes",
            references: { files: [], symbols: [], lines: [], versions: [], commands: [] },
            evidenceProvided: [], // No repro_steps and no stack_trace
          },
          verdict: "insufficient_evidence",
          confidence: "low",
          needsHumanReview: false,
          evidence: [],
          missing: ["Reproduction script", "Crash traceback"],
        },
      ],
    });

    const reply = buildReporterReply(report);
    expect(reply).not.toBeNull();
    expect(reply).toContain("Minimal, step-by-step reproduction instructions");
    expect(reply).toContain("complete error output or stack trace");
  });

  it("triggers contradicted request asking about version/fork with short SHA", () => {
    const report = makeReport({
      target: {
        owner: "acme",
        repo: "widgets",
        number: 5,
        kind: "issue",
        url: "https://github.com/acme/widgets/issues/5",
        title: "Test",
        commit: "fedcba9876543210fedcba9876543210fedcba98",
      },
      triage: { label: "cannot-reproduce", rationale: "Code not found" },
      assessments: [
        {
          claim: {
            id: "c1",
            type: "code_location",
            statement: "File src/missing.ts exists",
            quote: "in src/missing.ts",
            references: { files: ["src/missing.ts"], symbols: [], lines: [], versions: [], commands: [] },
            evidenceProvided: ["code_snippet"],
          },
          verdict: "contradicted",
          confidence: "medium",
          needsHumanReview: false,
          evidence: [],
          missing: ["Alternative branch or version"],
        },
      ],
    });

    const reply = buildReporterReply(report);
    expect(reply).not.toBeNull();
    expect(reply).toContain("fedcba9");
    expect(reply).toContain("referenced code was not found");
  });

  it("triggers abstained request when extraction abstained", () => {
    const report = loadReport("abstained-report.json");
    const reply = buildReporterReply(report);

    expect(reply).not.toBeNull();
    expect(reply).toContain(
      "Restate the problem with concrete steps, expected result, and actual result",
    );
  });

  it("deduplicates requests and formats as numbered list", () => {
    const report = makeReport({
      triage: { label: "needs-info", rationale: "Needs info" },
      assessments: [
        {
          claim: {
            id: "c1",
            type: "behavior",
            statement: "Behavior claim 1",
            quote: "quote 1",
            references: { files: [], symbols: [], lines: [], versions: [], commands: [] },
            evidenceProvided: [],
          },
          verdict: "insufficient_evidence",
          confidence: "low",
          needsHumanReview: false,
          evidence: [],
          missing: ["Missing 1"],
        },
        {
          claim: {
            id: "c2",
            type: "behavior",
            statement: "Behavior claim 2",
            quote: "quote 2",
            references: { files: [], symbols: [], lines: [], versions: [], commands: [] },
            evidenceProvided: [],
          },
          verdict: "insufficient_evidence",
          confidence: "low",
          needsHumanReview: false,
          evidence: [],
          missing: ["Missing 1"], // Duplicate missing
        },
      ],
    });

    const reply = buildReporterReply(report)!;
    expect(reply).not.toBeNull();

    // Requests are numbered (the report gives no version, so that request comes first)
    expect(reply).toMatch(/1\. The exact version[^\n]*\n2\. Minimal, step-by-step reproduction instructions/);

    // Repro request is not duplicated
    const matches = reply.match(/Minimal, step-by-step reproduction instructions/g);
    expect(matches).toHaveLength(1);

    // Missing details are deduplicated
    const missingMatches = reply.match(/- Missing 1/g);
    expect(missingMatches).toHaveLength(1);
  });

  it("contains no 'invalid' wording toward the reporter", () => {
    const report = loadReport("sample-report.json");
    const reply = buildReporterReply(report)!;

    expect(reply).not.toBeNull();
    expect(reply.toLowerCase()).not.toContain("invalid");
    expect(reply.toLowerCase()).not.toContain("blame");
  });

  it("stays under 1500 characters before the details section", () => {
    const report = loadReport("sample-report.json");
    const reply = buildReporterReply(report)!;

    expect(reply).not.toBeNull();
    const [beforeDetails] = reply.split("Details from the automated check:");
    expect(beforeDetails).toBeDefined();
    expect(beforeDetails!.length).toBeLessThan(1500);

    // Check closing line
    expect(reply).toContain(
      "This reply was drafted by Pramaan, an automated evidence check; a maintainer will review the issue.",
    );
  });
});
