import { describe, expect, it } from "vitest";
import { headline, MAX_LINKS, parseQueueInput, rankItems, type RankInput } from "../../src/app/lib/queue";
import type { ClaimAssessment, EvidenceKind, Report, Verdict } from "../../src/core/types";
import { ReportSchema } from "../../src/core/types";
import sampleData from "../fixtures/reports/sample-report.json";

const sample = ReportSchema.parse(sampleData);

function claim(id: string, verdict: Verdict, kind: EvidenceKind | null): ClaimAssessment {
  return {
    claim: {
      id,
      type: "behavior",
      statement: `Statement ${id}`,
      quote: "",
      references: { files: [], symbols: [], lines: [], versions: [], commands: [] },
      evidenceProvided: [],
    },
    verdict,
    confidence: "medium",
    evidence: kind ? [{ kind, source: "test", summary: "s" }] : [],
    missing: [],
    needsHumanReview: false,
  };
}

const report = (assessments: ClaimAssessment[]): Report => ({ ...sample, assessments });
const done = (index: number, assessments: ClaimAssessment[]): RankInput => ({
  index,
  state: "done",
  report: report(assessments),
});

describe("parseQueueInput", () => {
  it("detects issues and pull requests across repositories, ignoring blank lines", () => {
    const parsed = parseQueueInput(
      "https://github.com/a/one/issues/1\n\n  https://github.com/b/two/pull/22/ \nhttps://github.com/a/one/issues/3#issuecomment-9",
    );
    expect(parsed.error).toBeUndefined();
    expect(parsed.valid).toBe(3);
    expect(parsed.lines.map((l) => [l.kind, l.label])).toEqual([
      ["issue", "a/one#1"],
      ["pull", "b/two#22"],
      ["issue", "a/one#3"],
    ]);
  });

  it("reports bad and repeated lines one by one without failing the batch", () => {
    const parsed = parseQueueInput(
      "https://github.com/a/one/issues/1\nnot a link\nhttps://gitlab.com/a/b/issues/2\nhttps://github.com/A/One/issues/1",
    );
    expect(parsed.error).toBeUndefined();
    expect(parsed.valid).toBe(1);
    expect(parsed.lines[1]?.error).toContain("Not a GitHub");
    expect(parsed.lines[2]?.error).toContain("Not a GitHub");
    expect(parsed.lines[3]?.error).toBe("Same as line 1");
  });

  it("needs 2 to 10 links", () => {
    expect(parseQueueInput("https://github.com/a/b/issues/1").error).toContain("at least 2");
    const many = Array.from({ length: MAX_LINKS + 1 }, (_, i) => `https://github.com/a/b/issues/${i + 1}`).join("\n");
    expect(parseQueueInput(many).error).toContain("at most 10");
    expect(parseQueueInput("x\ny").error).toContain("None of these");
  });
});

describe("rankItems", () => {
  it("puts reproduced first, then contradicted, not reproduced, insufficient evidence, failed and invalid", () => {
    const items: RankInput[] = [
      { index: 0, state: "invalid" },
      { index: 1, state: "failed" },
      done(2, [claim("i", "insufficient_evidence", null)]),
      done(3, [claim("n", "not_reproduced", "executed_repro")]),
      done(4, [claim("c", "contradicted", "static_proof")]),
      done(5, [claim("r", "reproduced", "failing_test"), claim("x", "insufficient_evidence", null)]),
    ];
    expect(rankItems(items).map((i) => i.index)).toEqual([5, 4, 3, 2, 1, 0]);
  });

  it("ranks an item by its strongest claim", () => {
    const h = headline(done(0, [claim("i", "insufficient_evidence", null), claim("c", "contradicted", "static_proof")]));
    expect(h.verdict).toBe("contradicted");
    expect(h.claim?.claim.id).toBe("c");
  });

  it("breaks ties by evidence level, then strongly evidenced claims, then paste order", () => {
    const items: RankInput[] = [
      done(0, [claim("a", "reproduced", "static_proof")]),
      done(1, [claim("b", "reproduced", "executed_repro")]),
      done(2, [claim("c", "contradicted", "static_proof")]),
      done(3, [claim("d", "contradicted", "static_proof"), claim("e", "insufficient_evidence", "static_proof")]),
      done(4, [claim("f", "contradicted", "static_proof")]),
    ];
    expect(rankItems(items).map((i) => i.index)).toEqual([1, 0, 3, 2, 4]);
  });

  it("keeps unfinished items after finished ones and does not reorder the input array", () => {
    const items: RankInput[] = [{ index: 0, state: "running" }, done(1, [claim("a", "insufficient_evidence", null)])];
    expect(rankItems(items).map((i) => i.index)).toEqual([1, 0]);
    expect(items[0]?.index).toBe(0);
  });
});
