import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createDeps } from "../../src/cli/deps";
import { type Checkout, type RepoRef, runPipeline } from "../../src/core";
import { LlmClaimExtractor } from "../../src/core/claims";
import { createStaticVerifiers } from "../../src/core/static";
import { FakeGitHub, FakeLlm, makeTarget, sampleRef } from "../fakes";

const demo = join(import.meta.dirname, "../fixtures/repos/demo");
const SHA = "0123456789abcdef0123456789abcdef01234567";

class DemoCheckoutGitHub extends FakeGitHub {
  override async checkout(repo: RepoRef, commit?: string): Promise<Checkout> {
    this.checkouts.push({ repo, commit });
    return { dir: demo, commit: SHA };
  }
}

const fabricated = makeTarget({
  title: "parse_url_v2() crashes on empty input",
  body: "Calling parse_url_v2('') in src/url.py raises IndexError. The function parse_url in src/url.py is also affected.",
});

// What the extractor model returns for this report, replayed so the test needs no Ollama.
const modelOutput = JSON.stringify({
  claims: [
    {
      type: "behavior",
      statement: "Calling parse_url_v2 with an empty string raises IndexError.",
      quote: "Calling parse_url_v2('') in src/url.py raises IndexError",
      references: { files: ["src/url.py"], symbols: ["parse_url_v2"], lines: [], versions: [], commands: [] },
      evidenceProvided: ["none"],
    },
  ],
});

describe("pipeline with the real extractor logic and static verifiers", () => {
  it("contradicts a report about a function that does not exist and suggests the invalid label", async () => {
    const report = await runPipeline(sampleRef, {
      github: new DemoCheckoutGitHub(fabricated),
      extractor: new LlmClaimExtractor({ llm: new FakeLlm("gemma4:e2b-it-qat", [modelOutput]) }),
      verifiers: createStaticVerifiers(),
    });

    expect(report.target.commit).toBe(SHA);
    expect(report.models).toEqual(["gemma4:e2b-it-qat"]);
    const [claim] = report.assessments;
    expect(claim?.verdict).toBe("contradicted");
    expect(claim?.confidence).toBe("medium");
    expect(claim?.evidence[0]?.summary).toBe("`parse_url_v2` is not defined or used anywhere in acme/widgets at 0123456.");
    expect(report.triage.label).toBe("invalid");
  });
});

describe("createDeps", () => {
  it("builds the real adapters from the environment without touching the network", () => {
    const deps = createDeps({ PRAMAAN_EXTRACT_MODEL: "gemma4:e2b-it-qat" });
    expect(deps.verifiers.map((v) => v.name)).toEqual(["code-references", "stack-trace"]);
    expect(deps.extractor).toBeInstanceOf(LlmClaimExtractor);
  });
});
