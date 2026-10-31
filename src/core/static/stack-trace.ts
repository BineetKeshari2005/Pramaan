import type { TargetDocument, Verifier, VerifyContext } from "../ports";
import type { Claim, Evidence, VerificationResult } from "../types";
import { excerpt, type RepoIndex } from "./repo-index";
import { permalink, shortSha } from "./references";

export const STACK_TRACE_VERIFIER = "stack-trace";

export interface StackFrame {
  file: string;
  line: number;
  func?: string;
}

export interface ParsedTrace {
  frames: StackFrame[];
  /** Exception type from the trace's final line, e.g. "AttributeError". */
  exception?: string;
}

const PY_FRAME = /File "([^"]+)", line (\d+)(?:, in ([\w<>.$]+))?/g;
const JS_FRAME = /^\s*at (?:(?:async )?([\w$.<>\[\] ]+?) \()?((?:[A-Za-z]:)?[^\s():]+):(\d+):\d+\)?\s*$/gm;
const JAVA_FRAME = /^\s*at ([\w$.]+)\.([\w$<>]+)\(([\w$.-]+\.(?:java|kt|scala|groovy)):(\d+)\)/gm;
const EXCEPTION = /^\s*((?:[\w$]+\.)*[\w$]*(?:Error|Exception|Exit|Interrupt|Warning))\b(?::|$)/m;

/** Extracts Python, JavaScript and Java stack frames from report text. */
export function parseStackTrace(text: string): ParsedTrace {
  const frames: StackFrame[] = [];
  for (const m of text.matchAll(PY_FRAME)) {
    frames.push({ file: m[1] as string, line: Number(m[2]), func: m[3] });
  }
  for (const m of text.matchAll(JS_FRAME)) {
    const file = m[2] as string;
    if (file.startsWith("node:") || file.startsWith("internal/")) continue;
    frames.push({ file, line: Number(m[3]), func: m[1]?.split(".").at(-1)?.trim() || undefined });
  }
  for (const m of text.matchAll(JAVA_FRAME)) {
    const pkg = (m[1] as string).split(".");
    const cls = pkg.at(-1) ?? "";
    const dir = pkg.slice(0, -1).join("/");
    frames.push({ file: dir ? `${dir}/${m[3]}` : (m[3] as string), line: Number(m[4]), func: m[2] === "<init>" ? cls : m[2] });
  }
  const tail = text.slice(text.lastIndexOf("Traceback") >= 0 ? text.lastIndexOf("Traceback") : 0);
  const exception = EXCEPTION.exec(tail)?.[1] ?? EXCEPTION.exec(text)?.[1];
  return { frames, exception: exception?.split(".").at(-1) };
}

export function reportText(doc: TargetDocument): string {
  return [doc.body, ...doc.comments.filter((c) => c.author === doc.author).map((c) => c.body)].join("\n");
}

const OUTSIDE_REPO = /(site-packages|dist-packages|node_modules|\/lib\/python\d|\\lib\\python|<frozen |<string>|<stdin>|^internal\/)/;

export class StackTraceVerifier implements Verifier {
  readonly name = STACK_TRACE_VERIFIER;
  private readonly traces = new WeakMap<TargetDocument, ParsedTrace>();

  constructor(private readonly indexFor: (dir: string) => RepoIndex) {}

  /** The trace is report-level; it is attached to claims that cite its exception, files or functions. */
  appliesTo(claim: Claim): boolean {
    return claim.type === "behavior" || claim.type === "code_location" || claim.evidenceProvided.includes("stack_trace");
  }

  private traceOf(doc: TargetDocument): ParsedTrace {
    let trace = this.traces.get(doc);
    if (!trace) {
      trace = parseStackTrace(reportText(doc));
      this.traces.set(doc, trace);
    }
    return trace;
  }

  async verify(claim: Claim, ctx: VerifyContext): Promise<VerificationResult | null> {
    const trace = this.traceOf(ctx.target);
    if (trace.frames.length === 0 || !this.relevant(claim, trace)) return null;

    const index = this.indexFor(ctx.checkout.dir);
    const at = `${ctx.target.ref.owner}/${ctx.target.ref.repo} at ${shortSha(ctx.checkout.commit)}`;
    const matched: Evidence[] = [];
    const drifted: Evidence[] = [];
    const absent: Evidence[] = [];
    let outside = 0;

    for (const frame of trace.frames) {
      const match = index.findFile(frame.file);
      if (!match.path) {
        if (OUTSIDE_REPO.test(frame.file) || !/[\\/]/.test(frame.file) && !/\.\w+$/.test(frame.file)) {
          outside++;
          continue;
        }
        absent.push({ kind: "static_proof", source: this.name, summary: `Trace frame \`${frame.file}:${frame.line}\` points to a file that does not exist in ${at}.` });
        continue;
      }
      const lines = index.lines(match.path) ?? [];
      const link = permalink(ctx, match.path, frame.line);
      const funcLine = frame.func && !frame.func.startsWith("<") ? findEnclosing(lines, frame.func, frame.line) : undefined;
      const lineOk = frame.line <= lines.length;
      if (lineOk && (funcLine !== undefined || !frame.func || frame.func.startsWith("<"))) {
        matched.push({
          kind: "static_proof",
          source: this.name,
          summary: `Frame \`${match.path}:${frame.line}\`${frame.func ? ` in \`${frame.func}\`` : ""} matches the code.`,
          location: { file: match.path, startLine: frame.line, endLine: frame.line, permalink: link },
          log: excerpt(lines, frame.line - 2, frame.line + 2),
        });
      } else {
        const where = frame.func ? index.findDefinitions(frame.func, 1)[0] : undefined;
        // A function named nowhere in the repo is fabricated, not just from another version.
        const fabricated = !!frame.func && !where && index.findMentions(frame.func, 1).length === 0;
        const detail = fabricated
          ? `\`${frame.func}\` does not exist anywhere in the repository`
          : !lineOk
            ? `the file has only ${lines.length} lines`
            : where
              ? `\`${frame.func}\` is defined at \`${where.file}:${where.line}\` instead`
              : `no definition of \`${frame.func}\` encloses that line`;
        const target = { file: match.path, permalink: permalink(ctx, match.path) };
        (fabricated ? absent : drifted).push({
          kind: "static_proof",
          source: this.name,
          summary: `Frame \`${match.path}:${frame.line}\`${frame.func ? ` in \`${frame.func}\`` : ""} does not line up: ${detail}.`,
          location: target,
        });
      }
    }

    const inRepo = matched.length + drifted.length + absent.length;
    if (inRepo === 0) return null;
    const note = outside > 0 ? ` (${outside} frame${outside > 1 ? "s" : ""} outside the repository ${outside > 1 ? "were" : "was"} skipped)` : "";

    if (absent.length > 0) {
      return {
        verdict: "contradicted",
        evidence: [...absent, ...drifted, ...matched],
        missing: [`The stack trace cites code that does not exist at ${shortSha(ctx.checkout.commit)}${note}. Ask for the exact version that produced it.`],
      };
    }
    if (drifted.length > 0) {
      return {
        verdict: "insufficient_evidence",
        evidence: [...drifted, ...matched],
        missing: [`${drifted.length} of ${inRepo} trace frames are at different lines than at ${shortSha(ctx.checkout.commit)}${note}; the report is probably from another version. Ask for the exact version or commit.`],
      };
    }
    return {
      verdict: "insufficient_evidence",
      evidence: [
        {
          kind: "static_proof",
          source: this.name,
          summary: `All ${inRepo} stack frames inside the repository match the code at ${shortSha(ctx.checkout.commit)}${note}, so the trace is consistent with this code path.`,
        },
        ...matched,
      ],
      missing: ["The crash itself was not reproduced by running the reported command."],
    };
  }

  private relevant(claim: Claim, trace: ParsedTrace): boolean {
    if (claim.evidenceProvided.includes("stack_trace")) return true;
    const text = `${claim.statement} ${claim.quote}`.toLowerCase();
    if (trace.exception && text.includes(trace.exception.toLowerCase())) return true;
    const names = trace.frames.flatMap((f) => [f.file.split(/[\\/]/).at(-1) ?? "", f.func ?? ""]).filter((n) => n.length >= 4 && !n.startsWith("<"));
    return names.some((n) => text.includes(n.toLowerCase())) ||
      claim.references.files.some((f) => trace.frames.some((fr) => fr.file.endsWith(f) || f.endsWith(fr.file.split(/[\\/]/).at(-1) ?? "\0")));
  }
}

/** Line of the definition of `func` that encloses `line`: the nearest one above it (functions can be very long). */
function findEnclosing(lines: string[], func: string, line: number): number | undefined {
  const name = func.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const def = new RegExp(`(?:\\bdef\\s+${name}\\b|\\bfunction\\s*\\*?\\s*${name}\\b|\\b${name}\\s*[=:]\\s*(?:async\\s+)?(?:function|\\()|^\\s*(?:async\\s+|static\\s+|public\\s+|private\\s+|protected\\s+|[\\w<>\\[\\]]+\\s+)*${name}\\s*\\()`);
  for (let i = Math.min(line, lines.length) - 1; i >= 0; i--) {
    if (def.test(lines[i] ?? "")) return i + 1;
  }
  return undefined;
}
