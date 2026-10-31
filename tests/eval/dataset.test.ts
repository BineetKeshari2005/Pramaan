import { describe, expect, it } from "vitest";
import { DatasetSchema } from "../../eval/schema";
import { parseTargetUrl } from "../../src/core/target";
import dataset from "../../eval/dataset.json";

describe("Evaluation dataset", () => {
  it("passes DatasetSchema validation", () => {
    expect(() => DatasetSchema.parse(dataset)).not.toThrow();
  });

  it("has valid, parseable issue URLs with kind 'issue'", () => {
    for (const c of dataset.cases) {
      const parsed = parseTargetUrl(c.url);
      expect(parsed.kind, `URL ${c.url} must be an issue`).toBe("issue");
      expect(parsed.owner.length).toBeGreaterThan(0);
      expect(parsed.repo.length).toBeGreaterThan(0);
      expect(parsed.number).toBeGreaterThan(0);
    }
  });

  it("has unique IDs and URLs", () => {
    const ids = new Set<string>();
    const urls = new Set<string>();

    for (const c of dataset.cases) {
      expect(ids.has(c.id), `Duplicate ID: ${c.id}`).toBe(false);
      expect(urls.has(c.url), `Duplicate URL: ${c.url}`).toBe(false);
      ids.add(c.id);
      urls.add(c.url);
    }
  });

  it("has at least 8 cases per reference label", () => {
    const counts: Record<string, number> = {
      invalid: 0,
      "cannot-reproduce": 0,
      confirmed: 0,
    };

    for (const c of dataset.cases) {
      counts[c.reference] = (counts[c.reference] ?? 0) + 1;
    }

    expect(counts["invalid"], "At least 8 invalid cases").toBeGreaterThanOrEqual(8);
    expect(counts["cannot-reproduce"], "At least 8 cannot-reproduce cases").toBeGreaterThanOrEqual(8);
    expect(counts["confirmed"], "At least 8 confirmed cases").toBeGreaterThanOrEqual(8);
  });

  it("has at most 3 cases per repository", () => {
    const repoCounts: Record<string, number> = {};

    for (const c of dataset.cases) {
      const { owner, repo } = parseTargetUrl(c.url);
      const key = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
      repoCounts[key] = (repoCounts[key] ?? 0) + 1;
      expect(repoCounts[key], `Repository ${key} has more than 3 cases`).toBeLessThanOrEqual(3);
    }
  });

  it("has at least 8 cases with a stack trace", () => {
    const count = dataset.cases.filter((c) => c.hasStackTrace).length;
    expect(count, "At least 8 cases must have a stack trace").toBeGreaterThanOrEqual(8);
  });

  it("has at least 3 security-related cases", () => {
    const count = dataset.cases.filter((c) => c.securityRelated).length;
    expect(count, "At least 3 cases must be security-related").toBeGreaterThanOrEqual(3);
  });

  it("has at least 18 cases in Python or JavaScript/TypeScript", () => {
    const pyOrJsTs = dataset.cases.filter((c) => {
      const lang = c.language.toLowerCase();
      return lang === "python" || lang === "javascript" || lang === "typescript";
    });
    expect(pyOrJsTs.length, "At least 18 cases in Python or JS/TS").toBeGreaterThanOrEqual(18);
  });

  it("has closedAt as a valid date in 2022 or later", () => {
    for (const c of dataset.cases) {
      const date = new Date(c.closedAt);
      expect(isNaN(date.getTime()), `Invalid closedAt date for ${c.id}: ${c.closedAt}`).toBe(false);
      expect(date.getUTCFullYear(), `closedAt must be in 2022 or later for ${c.id}`).toBeGreaterThanOrEqual(2022);
    }
  });
});
