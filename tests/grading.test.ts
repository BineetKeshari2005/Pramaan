import { describe, expect, it } from "vitest";
import { assessClaim, CONTEXT_ONLY, type ClaimAssessment, type Evidence, triage } from "../src/core";
import { makeClaim } from "./fakes";

const ev = (kind: Evidence["kind"]): Evidence => ({ kind, source: "test", summary: kind });
const ok = { status: "ok" as const, claims: [], model: "m", attempts: 1 };

describe("assessClaim", () => {
  const claim = makeClaim({ id: "c1" });

  it("abstains when no check produced a result", () => {
    const a = assessClaim(makeClaim({ id: "b", type: "behavior" }), []);
    expect(a.verdict).toBe("insufficient_evidence");
    expect(a.confidence).toBe("none");
    expect(a.needsHumanReview).toBe(true);
    expect(a.missing.length).toBeGreaterThan(0);
  });

  it("reports partial (low) evidence when code checks support an unsettled claim", () => {
    const a = assessClaim(makeClaim({ id: "b", type: "behavior" }), [
      { verdict: "insufficient_evidence", evidence: [ev("static_proof")], missing: ["not executed"] },
    ]);
    expect(a).toMatchObject({ verdict: "insufficient_evidence", confidence: "low", needsHumanReview: true });
    const weak = assessClaim(makeClaim({ id: "b", type: "behavior" }), [
      { verdict: "insufficient_evidence", evidence: [ev("plausible_text")], missing: [] },
    ]);
    expect(weak.confidence).toBe("none");
  });

  it("records bare version and environment details as context, not as work for a human", () => {
    const a = assessClaim(makeClaim({ id: "v", type: "version" }), []);
    expect(a.needsHumanReview).toBe(false);
    expect(a.missing).toEqual([CONTEXT_ONLY]);
  });

  it("does not flag an unsettled location claim, but does flag behavior and PR claims", () => {
    expect(assessClaim(makeClaim({ id: "l", type: "code_location" }), []).needsHumanReview).toBe(false);
    expect(assessClaim(makeClaim({ id: "p", type: "pr_claim" }), []).needsHumanReview).toBe(true);
  });

  it("derives confidence from evidence type, strongest wins", () => {
    const a = assessClaim(claim, [
      { verdict: "contradicted", evidence: [ev("plausible_text")], missing: [] },
      { verdict: "contradicted", evidence: [ev("static_proof")], missing: [] },
    ]);
    expect(a.verdict).toBe("contradicted");
    expect(a.confidence).toBe("medium");
    expect(a.needsHumanReview).toBe(false);
  });

  it("drops inconclusive checks' gaps once a decisive check settled the claim", () => {
    const a = assessClaim(makeClaim({ id: "p", type: "pr_claim" }), [
      { verdict: "insufficient_evidence", evidence: [ev("static_proof")], missing: ["The referenced code exists, but the described behavior was not executed."] },
      { verdict: "reproduced", evidence: [ev("failing_test")], missing: [] },
    ]);
    expect(a).toMatchObject({ verdict: "reproduced", confidence: "high", missing: [] });
    expect(a.evidence).toHaveLength(2);
  });

  it("gives high confidence to executed reproductions", () => {
    const a = assessClaim(claim, [{ verdict: "reproduced", evidence: [ev("executed_repro")], missing: [] }]);
    expect(a.confidence).toBe("high");
  });

  it("refuses to pick a side when checks disagree", () => {
    const a = assessClaim(claim, [
      { verdict: "reproduced", evidence: [ev("executed_repro")], missing: [] },
      { verdict: "contradicted", evidence: [ev("static_proof")], missing: [] },
    ]);
    expect(a.verdict).toBe("insufficient_evidence");
    expect(a.needsHumanReview).toBe(true);
    expect(a.evidence).toHaveLength(2);
  });

  it("always sends unreproduced security claims to a human", () => {
    const sec = makeClaim({ id: "s1", type: "security_impact" });
    const a = assessClaim(sec, [{ verdict: "contradicted", evidence: [ev("static_proof")], missing: [] }]);
    expect(a.needsHumanReview).toBe(true);
  });
});

describe("triage", () => {
  const assessed = (overrides: Partial<ClaimAssessment>): ClaimAssessment => ({
    claim: makeClaim({ id: "c" }),
    verdict: "contradicted",
    confidence: "medium",
    evidence: [],
    missing: [],
    needsHumanReview: false,
    ...overrides,
  });

  it("sends abstained extraction to a human", () => {
    expect(triage({ status: "abstained", reason: "bad JSON", model: "m", attempts: 3 }, []).label).toBe(
      "needs-human-review",
    );
  });

  it("asks for info when there are no claims", () => {
    expect(triage(ok, []).label).toBe("needs-info");
  });

  it("confirms on a high-confidence reproduction", () => {
    expect(triage(ok, [assessed({ verdict: "reproduced", confidence: "high" })]).label).toBe("confirmed");
  });

  it("marks invalid only when every checkable claim is contradicted", () => {
    expect(triage(ok, [assessed({}), assessed({ verdict: "insufficient_evidence", confidence: "none" })]).label).toBe(
      "invalid",
    );
    expect(triage(ok, [assessed({}), assessed({ verdict: "reproduced", confidence: "medium" })]).label).not.toBe(
      "invalid",
    );
  });

  it("labels cannot-reproduce when tested behavior did not occur", () => {
    expect(triage(ok, [assessed({ verdict: "not_reproduced", confidence: "high" })]).label).toBe("cannot-reproduce");
  });

  it("never marks an open security claim invalid", () => {
    const sec = assessed({ claim: makeClaim({ id: "s", type: "security_impact" }), needsHumanReview: true });
    expect(triage(ok, [sec]).label).toBe("needs-human-review");
  });
});
