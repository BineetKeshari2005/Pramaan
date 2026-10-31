import type { Verifier, VerifyContext } from "../ports";
import type { Claim, Evidence, VerificationResult } from "../types";
import { excerpt, type RepoIndex } from "./repo-index";

export const REFERENCES_VERIFIER = "code-references";

/** Only path-like strings count as files: "lib/x.py" or "x.py", not a package name like "js-abbreviation-number". */
export const looksLikePath = (s: string) => /\//.test(s) || /\.[A-Za-z0-9]{1,8}$/.test(s);

/**
 * Only identifier-like strings are searched as code symbols. Plain words ("config", "server")
 * occur everywhere and would make "not found" meaningless.
 */
export function codeSymbol(raw: string): string | undefined {
  const s = raw.trim().replace(/\(.*\)$/, "").replace(/\(\)$/, "");
  if (/^--?[A-Za-z][\w-]*$/.test(s)) return s; // CLI flag
  const last = s.split(/\.|::|#|->/).filter(Boolean).at(-1) ?? "";
  if (!/^[A-Za-z_$][\w$]*$/.test(last) || last.length < 3) return undefined;
  // Exception types are usually language built-ins (AttributeError, NullPointerException), not repo code.
  if (/(Error|Exception|Warning)$/.test(last)) return undefined;
  const identifierLike = /_/.test(last) || /[a-z][A-Z]/.test(last) || /^[A-Z][a-z]+[A-Z]/.test(last) || s !== last || raw.includes("(");
  return identifierLike ? last : undefined;
}

export function permalink(ctx: VerifyContext, file: string, start?: number, end?: number): string {
  const { owner, repo } = ctx.target.ref;
  const range = start ? `#L${start}${end && end !== start ? `-L${end}` : ""}` : "";
  return `https://github.com/${owner}/${repo}/blob/${ctx.checkout.commit}/${file.split("/").map(encodeURIComponent).join("/")}${range}`;
}

export const shortSha = (sha: string) => sha.slice(0, 7);

export class ReferencesVerifier implements Verifier {
  readonly name = REFERENCES_VERIFIER;

  constructor(private readonly indexFor: (dir: string) => RepoIndex) {}

  appliesTo(claim: Claim): boolean {
    const r = claim.references;
    return r.files.some(looksLikePath) || r.symbols.some((s) => codeSymbol(s) !== undefined) || r.lines.length > 0;
  }

  async verify(claim: Claim, ctx: VerifyContext): Promise<VerificationResult | null> {
    const index = this.indexFor(ctx.checkout.dir);
    const at = `${ctx.target.ref.owner}/${ctx.target.ref.repo} at ${shortSha(ctx.checkout.commit)}`;
    const support: Evidence[] = [];
    const contradictions: Evidence[] = [];
    const missing: string[] = [];
    const ev = (summary: string, extra: Partial<Evidence> = {}): Evidence => ({
      kind: "static_proof",
      source: this.name,
      summary,
      ...extra,
    });

    const resolved = new Map<string, string>();
    for (const file of claim.references.files.filter(looksLikePath)) {
      const match = index.findFile(file);
      if (match.path) {
        resolved.set(file, match.path);
        support.push(ev(`File \`${match.path}\` exists in ${at}.`, { location: { file: match.path, permalink: permalink(ctx, match.path) } }));
      } else {
        const hint = match.similar.length > 0 ? ` Files with the same name: ${match.similar.map((f) => `\`${f}\``).join(", ")}.` : "";
        contradictions.push(ev(`File \`${file}\` does not exist in ${at}.${hint}`));
      }
    }

    for (const raw of claim.references.symbols) {
      const symbol = codeSymbol(raw);
      if (!symbol) continue;
      const defs = symbol.startsWith("-") ? [] : index.findDefinitions(symbol, 3);
      if (defs.length > 0) {
        const d = defs[0] as (typeof defs)[number];
        const lines = index.lines(d.file) ?? [];
        support.push(
          ev(`\`${symbol}\` is defined in \`${d.file}\` line ${d.line}${defs.length > 1 ? ` (and ${defs.length - 1} more place${defs.length > 2 ? "s" : ""})` : ""}.`, {
            location: { file: d.file, startLine: d.line, endLine: d.line, permalink: permalink(ctx, d.file, d.line) },
            log: excerpt(lines, d.line - 2, d.line + 4),
          }),
        );
        continue;
      }
      const mentions = index.findMentions(symbol, 3);
      if (mentions.length > 0) {
        const m = mentions[0] as (typeof mentions)[number];
        support.push(
          ev(`\`${symbol}\` appears in \`${m.file}\` line ${m.line}, but no definition was found (it may come from a dependency or be generated).`, {
            kind: "plausible_text",
            location: { file: m.file, startLine: m.line, permalink: permalink(ctx, m.file, m.line) },
            log: m.text,
          }),
        );
      } else {
        contradictions.push(ev(`\`${symbol}\` is not defined or used anywhere in ${at}.`));
      }
    }

    for (const ref of claim.references.lines) {
      const file = resolved.get(ref.file) ?? index.findFile(ref.file).path;
      if (!file) {
        if (!claim.references.files.some((f) => f === ref.file)) contradictions.push(ev(`File \`${ref.file}\` (cited at line ${ref.line}) does not exist in ${at}.`));
        continue;
      }
      const lines = index.lines(file);
      if (!lines) {
        missing.push(`\`${file}\` could not be read as text to check line ${ref.line}.`);
        continue;
      }
      if (ref.line > lines.length) {
        contradictions.push(ev(`\`${file}\` has only ${lines.length} lines, so line ${ref.line} does not exist in ${at}.`, { location: { file, permalink: permalink(ctx, file) } }));
        continue;
      }
      support.push(
        ev(`Line ${ref.line} of \`${file}\` exists; the code there is shown below.`, {
          location: { file, startLine: ref.line, endLine: ref.line, permalink: permalink(ctx, file, ref.line) },
          log: excerpt(lines, ref.line - 3, ref.line + 3),
        }),
      );
    }

    if (contradictions.length > 0) {
      return {
        verdict: "contradicted",
        evidence: [...contradictions, ...support],
        missing: [`The report names code that does not exist at ${shortSha(ctx.checkout.commit)}. Ask the reporter for the exact version or commit they used.`],
      };
    }
    if (support.length === 0) return null;
    if (claim.type === "code_location" && support.every((e) => e.kind === "static_proof")) {
      return { verdict: "reproduced", evidence: support, missing: [] };
    }
    return {
      verdict: "insufficient_evidence",
      evidence: support,
      missing: ["The referenced code exists, but the described behavior was not executed."],
    };
  }
}
