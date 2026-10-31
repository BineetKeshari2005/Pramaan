import type { Verifier, VerifyContext } from "../ports";
import type { Claim, Evidence, VerificationResult } from "../types";
import { codeSymbol, looksLikePath, permalink, shortSha } from "./references";
import type { RepoIndex } from "./repo-index";
import { excerpt } from "./repo-index";

export const PR_DIFF_VERIFIER = "pr-diff";

/**
 * Decides claims about what a pull request adds or changes, by comparing the repository at the
 * PR head with the base commit. Purely static: "this PR changes file X" and "this PR adds
 * symbol Y" are fully checkable from the two trees and the changed-file list.
 */
export class PrDiffVerifier implements Verifier {
  readonly name = PR_DIFF_VERIFIER;

  constructor(private readonly indexFor: (dir: string) => RepoIndex) {}

  appliesTo(claim: Claim): boolean {
    const r = claim.references;
    return (
      (claim.type === "pr_claim" || claim.type === "code_location" || claim.type === "behavior") &&
      (r.files.some(looksLikePath) || r.symbols.some((s) => codeSymbol(s) !== undefined))
    );
  }

  async verify(claim: Claim, ctx: VerifyContext): Promise<VerificationResult | null> {
    const pull = ctx.target.pull;
    if (!pull || !ctx.checkoutAt) return null;
    const head = this.indexFor(ctx.checkout.dir);
    const base = this.indexFor((await ctx.checkoutAt(pull.baseSha)).dir);
    const at = `${shortSha(pull.baseSha)}..${shortSha(pull.headSha)}`;

    const support: Evidence[] = [];
    const weak: Evidence[] = [];
    let changedFileHits = 0;
    let unchangedFileHits = 0;
    let addedSymbol = false;

    for (const file of claim.references.files.filter(looksLikePath)) {
      const match = head.findFile(file);
      if (!match.path) continue; // a missing file is the references verifier's finding, not ours
      if (pull.changedFiles.includes(match.path)) {
        changedFileHits++;
        support.push({
          kind: "static_proof",
          source: this.name,
          summary: `\`${match.path}\` is among the files this pull request changes (${at}).`,
          location: { file: match.path, permalink: permalink(ctx, match.path) },
        });
      } else {
        unchangedFileHits++;
        weak.push({
          kind: "plausible_text",
          source: this.name,
          summary: `\`${match.path}\` exists but is not one of the files this pull request changes.`,
        });
      }
    }

    for (const raw of claim.references.symbols) {
      const symbol = codeSymbol(raw);
      if (!symbol) continue;
      const def = head.findDefinitions(symbol, 1)[0];
      if (!def) continue; // absence is the references verifier's finding
      const inBase = base.findDefinitions(symbol, 1).length > 0;
      if (!inBase) {
        addedSymbol = true;
        support.push({
          kind: "static_proof",
          source: this.name,
          summary: `\`${symbol}\` is defined at the PR head (\`${def.file}\` line ${def.line}) and not at the base commit: it is added by this pull request.`,
          location: { file: def.file, startLine: def.line, endLine: def.line, permalink: permalink(ctx, def.file, def.line) },
          log: excerpt(head.lines(def.file) ?? [], def.line - 2, def.line + 4),
        });
      } else {
        weak.push({
          kind: "plausible_text",
          source: this.name,
          summary: `\`${symbol}\` already exists at the base commit, so it is not new in this pull request.`,
        });
      }
    }

    if (support.length === 0 && weak.length === 0) return null;
    const aboutChange = claim.type === "pr_claim" || claim.type === "code_location";

    if (aboutChange && (addedSymbol || (changedFileHits > 0 && unchangedFileHits === 0))) {
      return { verdict: "reproduced", evidence: [...support, ...weak], missing: [] };
    }
    if (aboutChange && claim.type === "pr_claim" && unchangedFileHits > 0 && changedFileHits === 0 && !addedSymbol) {
      return {
        verdict: "contradicted",
        evidence: [...weak, ...support],
        missing: [`The claim names code this pull request does not touch (${at}).`],
      };
    }
    // Behavior claims: the diff facts are context, never proof that the behavior occurs.
    return {
      verdict: "insufficient_evidence",
      evidence: [...support, ...weak],
      missing: claim.type === "behavior" ? ["The changed code exists, but the described behavior was not executed."] : [],
    };
  }
}
