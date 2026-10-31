import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildExtractionPrompt,
  createExtractorFromEnv,
  DEFAULT_EXTRACT_MODEL,
  extractorOllamaOptions,
  LlmClaimExtractor,
  parseExtractionOutput,
  reportSections,
} from "../../src/core/claims";
import { OllamaUnavailableError } from "../../src/core/llm";
import type { TargetDocument } from "../../src/core/ports";
import { FakeLlm, makeTarget } from "../fakes";

const fixturesDir = join(import.meta.dirname, "../fixtures");
const normalize = (s: string) => s.toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ").trim();

interface Recording {
  model: string;
  inputFile: string;
  responses: string[];
  summary: { status: string; attempts: number; claims: number; droppedByGrounding: number };
}

const recordings = readdirSync(join(fixturesDir, "ollama"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => ({ name: f, rec: JSON.parse(readFileSync(join(fixturesDir, "ollama", f), "utf8")) as Recording }));

describe("LlmClaimExtractor on recorded real model output", () => {
  it("has recordings for at least four real reports", () => {
    expect(recordings.length).toBeGreaterThanOrEqual(4);
  });

  it.each(recordings)("$name replays to the recorded result with grounded claims", async ({ name, rec }) => {
    const doc = JSON.parse(readFileSync(join(fixturesDir, "issues", name), "utf8")) as TargetDocument;
    const llm = new FakeLlm(rec.model, [...rec.responses]);
    const result = await new LlmClaimExtractor({ llm }).extract(doc);

    expect(result.status).toBe(rec.summary.status);
    expect(result.attempts).toBe(rec.summary.attempts);
    if (result.status !== "ok") return;
    expect(result.claims).toHaveLength(rec.summary.claims);

    const text = normalize(reportSections(doc).join("\n"));
    result.claims.forEach((claim, i) => {
      expect(claim.id).toBe(`c${i + 1}`);
      expect(text).toContain(normalize(claim.quote));
      for (const file of claim.references.files) expect(text).toContain(normalize(file));
      for (const symbol of claim.references.symbols) expect(text).toContain(normalize(symbol));
    });
  });
});

// Hand-written model outputs for failure modes real recordings rarely hit.
const doc = makeTarget({
  title: "parse_url_v2() crashes on empty input",
  body: "Calling `parse_url_v2('')` in ./src/url.py line 88 raises IndexError on v1.4.0. Thanks for the great library!",
});

const claimJson = (overrides: Record<string, unknown> = {}) => ({
  type: "behavior",
  statement: "parse_url_v2 raises IndexError on empty input.",
  quote: "parse_url_v2('') in ./src/url.py line 88 raises IndexError",
  references: { files: ["./src/url.py"], symbols: ["parse_url_v2()"], lines: [{ file: "src/url.py", line: 88 }], versions: ["v1.4.0"], commands: [] },
  evidenceProvided: ["none"],
  ...overrides,
});
const output = (...claims: object[]) => JSON.stringify({ claims });

describe("LlmClaimExtractor (synthetic cases)", () => {
  it("synthetic: retries after broken JSON and succeeds on attempt 2", async () => {
    const llm = new FakeLlm("m", ['{"claims": [ {"type": "behav', output(claimJson())]);
    const result = await new LlmClaimExtractor({ llm }).extract(doc);
    expect(result).toMatchObject({ status: "ok", attempts: 2 });
    expect(llm.requests[1]?.prompt).toContain("Your previous output was invalid: not valid JSON");
  });

  it("synthetic: abstains after three invalid outputs", async () => {
    const llm = new FakeLlm("m", ["nope", '{"claims": "x"}', output({ type: "opinion", statement: "s", quote: "q" })]);
    const result = await new LlmClaimExtractor({ llm }).extract(doc);
    expect(result.status).toBe("abstained");
    expect(result.attempts).toBe(3);
    if (result.status === "abstained") expect(result.reason).toContain("invalid after 3 attempts");
  });

  it("synthetic: drops a claim whose quote is not in the report", async () => {
    const llm = new FakeLlm("m", [output(claimJson(), claimJson({ statement: "It leaks memory.", quote: "leaks 4GB of memory per request" }))]);
    const result = await new LlmClaimExtractor({ llm }).extract(doc);
    expect(result.status === "ok" && result.claims.map((c) => c.statement)).toEqual([
      "parse_url_v2 raises IndexError on empty input.",
    ]);
  });

  it("synthetic: abstains when every claim is hallucinated", async () => {
    const llm = new FakeLlm("m", [output(claimJson({ quote: "segfault in libcurl" }))]);
    const result = await new LlmClaimExtractor({ llm }).extract(doc);
    expect(result).toMatchObject({ status: "abstained", reason: "extracted claims were not grounded in the report text" });
  });

  it("synthetic: strips references that the report never mentions and normalizes the rest", async () => {
    const llm = new FakeLlm("m", [
      output(
        claimJson({
          references: {
            files: ["./src/url.py", "src/invented.py"],
            symbols: ["parse_url_v2()", "secret_helper"],
            lines: [{ file: "src/url.py", line: 88 }, { file: "src/url.py", line: 4242 }],
            versions: ["1.4.0", "v9.9.9"],
            commands: ["rm -rf /"],
          },
          evidenceProvided: ["none", "code_snippet"],
        }),
      ),
    ]);
    const result = await new LlmClaimExtractor({ llm }).extract(doc);
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.claims[0]?.references).toEqual({
      files: ["src/url.py"],
      symbols: ["parse_url_v2"],
      lines: [{ file: "src/url.py", line: 88 }],
      versions: ["1.4.0"],
      commands: [],
    });
    expect(result.claims[0]?.evidenceProvided).toEqual(["code_snippet"]);
  });

  it("synthetic: parses output wrapped in a ```json fence", async () => {
    const llm = new FakeLlm("m", [`\`\`\`json\n${output(claimJson())}\n\`\`\``]);
    expect((await new LlmClaimExtractor({ llm }).extract(doc)).status).toBe("ok");
  });

  it("synthetic: dedupes identical statements and caps the claim count", async () => {
    const many = Array.from({ length: 20 }, (_, i) => claimJson({ statement: `Claim number ${i % 15} is checkable.` }));
    const llm = new FakeLlm("m", [output(...many)]);
    const result = await new LlmClaimExtractor({ llm, maxClaims: 12 }).extract(doc);
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.claims).toHaveLength(12);
    expect(result.claims.map((c) => c.id)).toEqual(Array.from({ length: 12 }, (_, i) => `c${i + 1}`));
  });

  it("synthetic: drops fragments left when the model breaks a string at an inner quote", async () => {
    const llm = new FakeLlm("m", [
      output(
        claimJson(),
        claimJson({ statement: "Calling `parse_url_v2(", quote: "parse_url_v2('') in ./src/url.py" }),
        claimJson({ statement: "The function raises an error.", quote: "line 88" }),
      ),
    ]);
    const result = await new LlmClaimExtractor({ llm }).extract(doc);
    expect(result.status === "ok" && result.claims).toHaveLength(1);
  });

  it("synthetic: returns ok with no claims when the report makes none", async () => {
    const llm = new FakeLlm("m", ['{"claims": []}']);
    expect(await new LlmClaimExtractor({ llm }).extract(doc)).toEqual({ status: "ok", claims: [], model: "m", attempts: 1 });
  });

  it("synthetic: lets Ollama connection errors propagate instead of abstaining", async () => {
    const llm = { model: "m", completeJson: async () => Promise.reject(new OllamaUnavailableError("down")) };
    await expect(new LlmClaimExtractor({ llm }).extract(doc)).rejects.toBeInstanceOf(OllamaUnavailableError);
  });

  it("synthetic: sends the JSON schema so Ollama constrains the output", async () => {
    const llm = new FakeLlm("m", ['{"claims": []}']);
    await new LlmClaimExtractor({ llm }).extract(doc);
    expect(llm.requests[0]?.jsonSchema).toMatchObject({ type: "object", required: ["claims"] });
  });
});

describe("buildExtractionPrompt", () => {
  const withComments = makeTarget({
    author: "reporter",
    comments: [
      { author: "reporter", body: "Also happens on v1.5.0.", createdAt: "2026-10-02T00:00:00Z" },
      { author: "drive-by", body: "I think the real bug is in auth.py", createdAt: "2026-10-03T00:00:00Z" },
    ],
  });

  it("synthetic: includes the author's follow-ups and excludes other people's comments", () => {
    const prompt = buildExtractionPrompt(withComments);
    expect(prompt).toContain("Also happens on v1.5.0.");
    expect(prompt).not.toContain("auth.py");
    expect(reportSections(withComments).join(" ")).not.toContain("auth.py");
  });

  it("synthetic: lists changed files for pull requests and marks truncation", () => {
    const pr = makeTarget({
      ref: { owner: "a", repo: "b", number: 1, kind: "pull" },
      body: "x".repeat(500),
      pull: { baseSha: "b", headSha: "h", changedFiles: ["lib/a.ts"] },
    });
    expect(buildExtractionPrompt(pr)).toContain("Report type: pull request");
    expect(buildExtractionPrompt(pr)).toContain("- lib/a.ts");
    expect(buildExtractionPrompt(pr, 100)).toContain("[truncated]");
  });
});

describe("parseExtractionOutput", () => {
  it("synthetic: reports which field failed validation", () => {
    const outcome = parseExtractionOutput(output({ type: "behavior", quote: "q" }));
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error).toContain("claims.0.statement");
  });
});

describe("createExtractorFromEnv", () => {
  it("synthetic: builds an extractor without contacting Ollama", () => {
    expect(createExtractorFromEnv({ PRAMAAN_EXTRACT_MODEL: "x", OLLAMA_URL: "http://h:1" })).toBeInstanceOf(LlmClaimExtractor);
  });

  it("synthetic: defaults to Gemma 4 with thinking on, overridable from the environment", () => {
    expect(extractorOllamaOptions({})).toEqual({ model: DEFAULT_EXTRACT_MODEL, baseUrl: undefined, think: true });
    expect(extractorOllamaOptions({ PRAMAAN_EXTRACT_MODEL: "gemma4:e4b", PRAMAAN_EXTRACT_THINK: "FALSE" })).toMatchObject({
      model: "gemma4:e4b",
      think: false,
    });
  });
});
