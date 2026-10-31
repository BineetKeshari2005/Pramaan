import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { VerifyContext } from "../../src/core";
import { PrDiffVerifier, RepoIndex } from "../../src/core/static";
import { makeClaim, makeTarget } from "../fakes";

// Head: the demo fixture repo. Base: a copy without renderPage and with an older app.js.
const head = path.join(import.meta.dirname, "../fixtures/repos/demo");
const base = fs.mkdtempSync(path.join(os.tmpdir(), "pramaan-base-"));
fs.cpSync(head, base, { recursive: true });
fs.writeFileSync(path.join(base, "web/app.js"), "export const formatDate = (d) => d.toISOString();\n");
afterAll(() => fs.rmSync(base, { recursive: true, force: true }));

const BASE_SHA = "1".repeat(40);
const HEAD_SHA = "2".repeat(40);
const indexes = new Map<string, RepoIndex>();
const indexFor = (dir: string) => {
  if (!indexes.has(dir)) indexes.set(dir, new RepoIndex(dir));
  return indexes.get(dir) as RepoIndex;
};

const ctx = (changedFiles: string[]): VerifyContext => ({
  target: makeTarget({
    ref: { owner: "acme", repo: "demo", number: 9, kind: "pull" },
    pull: { baseSha: BASE_SHA, headSha: HEAD_SHA, changedFiles },
  }),
  checkout: { dir: head, commit: HEAD_SHA },
  checkoutAt: async () => ({ dir: base, commit: BASE_SHA }),
});

const refs = (r: Partial<{ files: string[]; symbols: string[] }>) => ({
  files: [],
  symbols: [],
  lines: [],
  versions: [],
  commands: [],
  ...r,
});

describe("PrDiffVerifier", () => {
  const verifier = new PrDiffVerifier(indexFor);

  it("reproduces a claim that the PR adds a symbol: defined at head, absent at base", async () => {
    const claim = makeClaim({ id: "c1", type: "pr_claim", statement: "The PR adds renderPage.", references: refs({ symbols: ["renderPage"] }) });
    const result = await verifier.verify(claim, ctx(["web/app.js"]));
    expect(result?.verdict).toBe("reproduced");
    expect(result?.evidence[0]?.summary).toContain("added by this pull request");
  });

  it("reproduces a claim about changing a file that the diff really changes", async () => {
    const claim = makeClaim({ id: "c2", type: "pr_claim", statement: "The PR changes web/app.js.", references: refs({ files: ["web/app.js"] }) });
    expect((await verifier.verify(claim, ctx(["web/app.js"])))?.verdict).toBe("reproduced");
  });

  it("contradicts a PR claim that only names untouched code", async () => {
    const claim = makeClaim({ id: "c3", type: "pr_claim", statement: "The PR rewrites src/url.py.", references: refs({ files: ["src/url.py"] }) });
    const result = await verifier.verify(claim, ctx(["web/app.js"]));
    expect(result?.verdict).toBe("contradicted");
    expect(result?.missing[0]).toContain("does not touch");
  });

  it("marks a pre-existing symbol as not new instead of crediting the PR", async () => {
    const claim = makeClaim({ id: "c4", type: "pr_claim", statement: "The PR adds formatDate.", references: refs({ symbols: ["formatDate"] }) });
    const result = await verifier.verify(claim, ctx(["web/app.js"]));
    expect(result?.verdict).toBe("insufficient_evidence");
    expect(result?.evidence.some((e) => e.summary.includes("not new in this pull request"))).toBe(true);
  });

  it("gives behavior claims diff context but never a verdict", async () => {
    const claim = makeClaim({ id: "c5", type: "behavior", statement: "Search now keeps its query.", references: refs({ files: ["web/app.js"] }) });
    const result = await verifier.verify(claim, ctx(["web/app.js"]));
    expect(result?.verdict).toBe("insufficient_evidence");
    expect(result?.evidence[0]?.kind).toBe("static_proof");
    expect(result?.missing[0]).toContain("was not executed");
  });

  it("stays silent on issues, without references, and for symbols the references verifier owns", async () => {
    const issueCtx = { ...ctx(["web/app.js"]), target: makeTarget() };
    const claim = makeClaim({ id: "c6", type: "pr_claim", statement: "The PR adds renderPage.", references: refs({ symbols: ["renderPage"] }) });
    expect(await verifier.verify(claim, issueCtx)).toBeNull();
    expect(verifier.appliesTo(makeClaim({ id: "c7", type: "pr_claim", statement: "x", references: refs({}) }))).toBe(false);
    const missing = makeClaim({ id: "c8", type: "pr_claim", statement: "The PR adds nothing_here.", references: refs({ symbols: ["nothing_here"] }) });
    expect(await verifier.verify(missing, ctx(["web/app.js"]))).toBeNull();
  });
});
