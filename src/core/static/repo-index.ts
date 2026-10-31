import fs from "node:fs";
import path from "node:path";

const SKIP_DIRS = new Set([".git", "node_modules", ".venv", "venv", "__pycache__", ".tox", ".next", "dist", "build", "target"]);
const MAX_FILES = 60_000;
const MAX_TEXT_BYTES = 1_000_000;
/** Total text kept in the line cache; searches never cache, so this stays small on huge repos. */
const MAX_CACHED_CHARS = 32_000_000;
const SOURCE_EXT = /\.(py|pyi|js|jsx|mjs|cjs|ts|tsx|mts|cts|go|rs|java|kt|kts|scala|rb|php|c|cc|cpp|cxx|h|hh|hpp|cs|swift|m|mm|sh|bash|lua|pl|pm|r|dart|ex|exs|erl|hs|ml|clj|groovy|gradle|vue|svelte)$/i;

export interface CodeLocation {
  file: string;
  line: number;
  text: string;
}

export interface FileMatch {
  /** Repository-relative path of the matched file, if any. */
  path?: string;
  /** Files with the same name elsewhere, when there is no match. */
  similar: string[];
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Read-only view of a checked-out repository. Never executes anything from it. */
export class RepoIndex {
  readonly files: string[];
  private readonly fileSet: Set<string>;
  private readonly lineCache = new Map<string, string[] | null>();
  private cachedChars = 0;

  constructor(readonly root: string) {
    this.files = listFiles(root);
    this.fileSet = new Set(this.files);
  }

  /** Matches a path as written in a report: relative, absolute from another machine, or Windows-style. */
  findFile(reported: string): FileMatch {
    const clean = reported.trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "").replace(/:\d+(:\d+)?$/, "");
    if (!clean) return { similar: [] };
    if (this.fileSet.has(clean)) return { path: clean, similar: [] };

    const parts = clean.split("/");
    // Paths from the reporter's machine (/home/u/proj/lib/x.py, C:/proj/lib/x.py): try ever-shorter
    // suffixes, but keep at least a directory and a file name so a bare basename never matches.
    const minParts = parts.length === 1 ? 1 : 2;
    for (let i = 0; parts.length - i >= minParts; i++) {
      const suffix = parts.slice(i).join("/");
      const hits = this.files.filter((f) => f === suffix || f.endsWith(`/${suffix}`));
      if (hits.length > 0) return { path: hits.sort((a, b) => a.length - b.length)[0], similar: [] };
    }

    const base = parts.at(-1) ?? clean;
    const similar = this.files.filter((f) => path.posix.basename(f) === base).slice(0, 5);
    return { similar };
  }

  /** Lines of a text file, from a small size-capped cache (only files shown as evidence are cached). */
  lines(file: string): string[] | null {
    const cached = this.lineCache.get(file);
    if (cached !== undefined) {
      // Re-insert so the Map's insertion order works as least-recently-used order.
      this.lineCache.delete(file);
      this.lineCache.set(file, cached);
      return cached;
    }
    const text = this.readText(file);
    const lines = text === null ? null : text.split(/\r?\n/);
    this.lineCache.set(file, lines);
    this.cachedChars += text?.length ?? 0;
    while (this.cachedChars > MAX_CACHED_CHARS && this.lineCache.size > 1) {
      const oldest = this.lineCache.keys().next().value as string;
      this.cachedChars -= (this.lineCache.get(oldest) ?? []).reduce((n, l) => n + l.length + 1, 0);
      this.lineCache.delete(oldest);
    }
    return lines;
  }

  /** Reads a text file inside the checkout without caching it; null for binaries, big files and anything outside. */
  private readText(file: string): string | null {
    const abs = path.join(this.root, file);
    if (!isInside(this.root, abs)) return null;
    try {
      const stat = fs.lstatSync(abs);
      if (!stat.isFile() || stat.size > MAX_TEXT_BYTES) return null;
      const text = fs.readFileSync(abs, "utf8");
      return text.includes("\u0000") ? null : text;
    } catch {
      return null;
    }
  }

  /** Definitions of a function, method, class, type or variable, across common languages. */
  findDefinitions(symbol: string, limit = 5): CodeLocation[] {
    const name = escapeRegex(symbol);
    const pattern = new RegExp(
      [
        `^\\s*(?:async\\s+)?def\\s+${name}\\s*\\(`, // Python
        `\\bclass\\s+${name}\\b`, // Python, Ruby, JS (incl. export class), Java...
        `\\bfunction\\s*\\*?\\s*${name}\\s*\\(`, // JS function
        `\\b(?:const|let|var)\\s+${name}\\s*[=:]`, // JS/TS binding
        `\\b(?:interface|type|enum|struct|trait|protocol)\\s+${name}\\b`, // types
        `^\\s*(?:export\\s+)?(?:public|private|protected|static|async|readonly|override|\\s)*(?:get\\s+|set\\s+)?${name}\\s*\\([^)]*\\)\\s*[:{]`, // methods
        `\\b${name}\\s*[:=]\\s*(?:async\\s+)?(?:function\\b|\\([^)]*\\)\\s*=>|[A-Za-z_$][\\w$]*\\s*=>)`, // arrow or property functions
        `\\bfunc\\s+(?:\\([^)]*\\)\\s*)?${name}\\s*[(\\[]`, // Go
        `\\bfn\\s+${name}\\b`, // Rust
        `^\\s*def\\s+(?:self\\.)?${name}\\b`, // Ruby
        `^[\\w<>\\[\\],?\\s]*\\b[\\w<>\\[\\]]+\\s+${name}\\s*\\([^;]*$`, // Java, C#, C-like
        `^${name}\\s*=`, // module-level assignment
      ].join("|"),
      "m",
    );
    return this.search(pattern, limit, true, symbol);
  }

  /** Any whole-word occurrence (or literal occurrence for flags like --force-ssl). */
  findMentions(token: string, limit = 5): CodeLocation[] {
    const escaped = escapeRegex(token);
    const pattern = /^[\w$]/.test(token) && /[\w$]$/.test(token) ? new RegExp(`\\b${escaped}\\b`) : new RegExp(escaped);
    return this.search(pattern, limit, false, token);
  }

  /**
   * Scans files without caching them, so a search over a very large repository holds one file in
   * memory at a time. `needle` is a plain substring every match must contain: a cheap pre-filter.
   */
  private search(pattern: RegExp, limit: number, sourceOnly: boolean, needle: string): CodeLocation[] {
    const out: CodeLocation[] = [];
    for (const file of this.files) {
      if (sourceOnly && !SOURCE_EXT.test(file)) continue;
      const text = this.readText(file);
      if (text === null || !text.includes(needle)) continue;
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        if (line.length < 2000 && pattern.test(line)) {
          out.push({ file, line: i + 1, text: line.trim() });
          if (out.length >= limit) return out;
        }
      }
    }
    return out;
  }
}

function isInside(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function listFiles(root: string): string[] {
  const out: string[] = [];
  const stack = [""];
  while (stack.length > 0 && out.length < MAX_FILES) {
    const rel = stack.pop() as string;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(path.join(root, rel), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      // Symlinks are never followed: a hostile repo could point them outside the checkout.
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) stack.push(child);
      } else if (entry.isFile()) {
        out.push(child);
      }
    }
  }
  return out.sort();
}

/** Formats lines [from, to] (1-based, inclusive) with line numbers, for evidence logs. */
export function excerpt(lines: string[], from: number, to: number): string {
  const start = Math.max(1, from);
  const end = Math.min(lines.length, to);
  const width = String(end).length;
  const out: string[] = [];
  for (let n = start; n <= end; n++) out.push(`${String(n).padStart(width)} | ${lines[n - 1] ?? ""}`);
  return out.join("\n");
}
