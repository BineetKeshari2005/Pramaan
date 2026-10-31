import type { TargetDocument } from "../ports";
import { codeSymbol, looksLikePath } from "../static/references";
import { parseStackTrace, reportText } from "../static/stack-trace";
import type { Claim, ProvidedEvidence } from "../types";

const STACK = /Traceback \(most recent call last\)|Exception in thread "|^\s+at [\w$.<>]+ ?\(?[^()\s]+:\d+(?::\d+)?\)?\s*$|panic: |thread '.*' panicked at/m;
const REPRO = /steps to reproduce|to reproduce|reproduction steps|minimal (example|repro)|^\s*command(?: line)?:\s*\S|^\s*(?:>>>|\$|>|PS [^>]*>)\s+\S/im;
const FENCE = /```|^(?: {4}|\t)\S/m;
const LOGS = /^\s*(?:\[?\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}|\[(?:INFO|WARN|WARNING|ERROR|DEBUG|TRACE)\]|(?:INFO|WARN|WARNING|ERROR|DEBUG|FATAL)[:\s]\s*\S)/m;
const SCREENSHOT = /!\[[^\]]*\]\([^)]+\)|<img\s|user-attachments\/assets|\.(?:png|jpe?g|gif)\b/i;
const TEST = /\bdef test_\w+|\b(?:it|test|describe)\(\s*["'`]|@Test\b|\bfunc Test\w+\(/;

/** What the reporter actually included, found by pattern matching: never by asking the model. */
export function detectProvidedEvidence(doc: TargetDocument): ProvidedEvidence[] {
  const text = reportText(doc);
  const found: ProvidedEvidence[] = [];
  if (parseStackTrace(text).frames.length > 0 || STACK.test(text)) found.push("stack_trace");
  if (REPRO.test(text)) found.push("repro_steps");
  if (LOGS.test(text)) found.push("logs");
  if (TEST.test(text)) found.push("test");
  if (FENCE.test(text)) found.push("code_snippet");
  if (SCREENSHOT.test(text)) found.push("screenshot");
  return found;
}

const REPORT_LEVEL_TYPES = new Set<Claim["type"]>(["behavior", "security_impact", "pr_claim"]);

/**
 * Adds report-level evidence to the claims it supports (behavior, security and PR claims), so a
 * claim backed by a pasted traceback is not graded as if the reporter gave nothing.
 */
export function withDetectedEvidence(claims: Claim[], detected: ProvidedEvidence[]): Claim[] {
  if (detected.length === 0) return claims;
  return claims.map((claim) => {
    if (!REPORT_LEVEL_TYPES.has(claim.type)) return claim;
    const merged = [...new Set([...claim.evidenceProvided, ...detected])].filter((e) => e !== "none");
    return { ...claim, evidenceProvided: merged };
  });
}

const CODE_SPAN = /`([^`\n]{2,80})`/g;
const VERSIONISH = /^v?\d[\w.-]*$/;
const MAX_MINED = 8;

/**
 * Copies code tokens the claim itself names in backticks into its references, so the verifiers
 * check them even when the model forgot to. Deterministic: only single backticked tokens from the
 * claim's own (grounded) text, classified with the same rules the verifiers use.
 */
export function mineReferences(claims: Claim[]): Claim[] {
  return claims.map((claim) => {
    const files = new Set(claim.references.files);
    const symbols = new Set(claim.references.symbols);
    for (const m of `${claim.statement}\n${claim.quote}`.matchAll(CODE_SPAN)) {
      const token = (m[1] as string).trim();
      if (/\s/.test(token) || VERSIONISH.test(token)) continue; // fragments and versions, not names
      if (looksLikePath(token) && !token.endsWith(")")) {
        files.add(token.replace(/^\.\//, ""));
      } else if (codeSymbol(token)) {
        // Keep the raw token: "isvalid()" stays identifier-like for the verifiers, "isvalid" would not.
        symbols.add(token);
      }
    }
    if (files.size === claim.references.files.length && symbols.size === claim.references.symbols.length) return claim;
    return {
      ...claim,
      references: {
        ...claim.references,
        files: [...files].slice(0, MAX_MINED),
        symbols: [...symbols].slice(0, MAX_MINED),
      },
    };
  });
}
