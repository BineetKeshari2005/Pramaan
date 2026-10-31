import type { TargetDocument } from "../ports";

export const SYSTEM_PROMPT = `You extract technical claims from a GitHub issue or pull request so that each claim can later be checked against the source code. You do NOT decide whether a claim is true.

Rules:
1. A claim is one atomic, checkable technical statement made by the reporter: what the software does, where code lives, which version is affected, what security impact exists, or what a pull request changes or fixes.
2. Split sentences that contain several claims into separate claims.
3. "quote" is copied character for character from the report: a short span, under 200 characters.
4. "statement" restates the claim as one plain sentence.
5. Put a file, symbol (function, class, method, variable, CLI flag), line number, version or command into "references" ONLY if it literally appears in the report. Never guess or invent.
6. "evidenceProvided" lists what the reporter actually included: stack_trace, repro_steps, logs, test, code_snippet, screenshot, or none.
7. Ignore greetings, thanks, opinions, feature requests and questions that make no claim.
8. If the report makes no technical claim, return {"claims": []}.

Claim types:
- behavior: what the software does or fails to do (crash, wrong output, error, hang)
- code_location: that specific code exists or lives somewhere (file, function, line)
- version: which versions are affected, or when a behavior started or changed
- security_impact: a vulnerability, exploit, data exposure or privilege problem
- pr_claim: what a pull request changes, fixes or tests

Example report:
Title: Crash in parse_config
Since v2.3.0, calling parse_config('') in src/config.py raises IndexError at line 42. Run \`app --config ''\` to see it.

Example output:
{"claims":[{"type":"behavior","statement":"Calling parse_config with an empty string raises IndexError.","quote":"calling parse_config('') in src/config.py raises IndexError at line 42","references":{"files":["src/config.py"],"symbols":["parse_config"],"lines":[{"file":"src/config.py","line":42}],"versions":[],"commands":["app --config ''"]},"evidenceProvided":["repro_steps"]},{"type":"version","statement":"The crash first appears in version 2.3.0.","quote":"Since v2.3.0","references":{"files":[],"symbols":[],"lines":[],"versions":["v2.3.0"],"commands":[]},"evidenceProvided":["none"]}]}`;

/** Text that counts as the reporter's own words: claims must be grounded in it. */
export function reportSections(doc: TargetDocument): string[] {
  const authorComments = doc.comments.filter((c) => c.author === doc.author).map((c) => c.body);
  return [doc.title, doc.body, ...authorComments];
}

export function buildExtractionPrompt(doc: TargetDocument, maxChars = 12000): string {
  const kind = doc.ref.kind === "pull" ? "pull request" : "issue";
  const authorComments = doc.comments.filter((c) => c.author === doc.author);
  const parts = [`Report type: ${kind}`, `Title: ${doc.title}`, "", "Body:", doc.body.trim() || "(empty)"];
  if (doc.pull && doc.pull.changedFiles.length > 0) {
    parts.push("", "Files changed by the pull request:", ...doc.pull.changedFiles.slice(0, 50).map((f) => `- ${f}`));
  }
  if (authorComments.length > 0) {
    parts.push("", "Follow-up comments by the original author:");
    for (const c of authorComments) parts.push("---", c.body.trim());
  }

  let report = parts.join("\n");
  if (report.length > maxChars) report = `${report.slice(0, maxChars)}\n[truncated]`;
  return `${report}\n\nExtract the technical claims from the report above as JSON.`;
}
