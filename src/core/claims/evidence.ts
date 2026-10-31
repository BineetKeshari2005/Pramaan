import type { TargetDocument } from "../ports";
import { parseStackTrace, reportText } from "../static/stack-trace";
import type { Claim, ProvidedEvidence } from "../types";

const STACK = /Traceback \(most recent call last\)|Exception in thread "|^\s+at [\w$.<>]+ ?\(?[^()\s]+:\d+(?::\d+)?\)?\s*$|panic: |thread '.*' panicked at/m;
const REPRO = /steps to reproduce|to reproduce|reproduction steps|minimal (example|repro)|^\s*(?:>>>|\$|>|PS [^>]*>)\s+\S/im;
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
