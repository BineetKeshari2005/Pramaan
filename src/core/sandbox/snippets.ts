export interface Snippet {
  language: "python";
  code: string;
  /** "repl" when rebuilt from a >>> session, "fence" for a fenced code block. */
  source: "repl" | "fence";
}

const FENCE = /```[ \t]*([\w+.-]*)[^\n]*\n([\s\S]*?)```/g;
const PY_LANGS = new Set(["python", "py", "python3", "pycon", "ipython"]);
const TRACEBACK = /Traceback \(most recent call last\)|^\s*File "[^"]+", line \d+/m;
const LOOKS_LIKE_PYTHON = /^\s*(?:import \w|from [\w.]+ import|def \w|class \w|print\(|[\w.]+\s*\(|[\w.\[\]'"]+\s*=[^=])/m;
const NOT_PYTHON = /^\s*(?:\$ |pip3? install|npm |yarn |curl |git |cd |sudo )/m;
const MAX_CHARS = 4000;

/** Turns an interactive `>>>` session into a script: keeps the input lines, drops the printed output. */
function fromRepl(text: string): string | undefined {
  const lines = text
    .split(/\r?\n/)
    .filter((l) => /^\s*(?:>>>|\.\.\.)(?: |$)/.test(l))
    .map((l) => l.replace(/^\s*(?:>>>|\.\.\.) ?/, ""));
  return lines.some((l) => l.trim()) ? lines.join("\n") : undefined;
}

/**
 * Python code the reporter pasted to show the problem: `>>>` sessions and fenced Python blocks.
 * Tracebacks, shell commands and other languages are skipped. The result is untrusted code and
 * must only ever run inside the sandbox.
 */
export function extractPythonSnippets(text: string): Snippet[] {
  const out: Snippet[] = [];
  const add = (code: string | undefined, source: Snippet["source"]) => {
    const clean = code?.replace(/\s+$/, "");
    if (!clean || clean.length > MAX_CHARS || NOT_PYTHON.test(clean)) return;
    if (!out.some((s) => s.code === clean)) out.push({ language: "python", code: clean, source });
  };

  for (const m of text.matchAll(FENCE)) {
    const lang = (m[1] ?? "").toLowerCase();
    const body = m[2] ?? "";
    if (/^\s*>>>/m.test(body)) {
      add(fromRepl(body), "repl");
    } else if (PY_LANGS.has(lang) && !TRACEBACK.test(body) && LOOKS_LIKE_PYTHON.test(body)) {
      add(body, "fence");
    }
  }
  // A >>> session pasted outside a code fence.
  add(fromRepl(text.replace(FENCE, "")), "repl");
  return out;
}
