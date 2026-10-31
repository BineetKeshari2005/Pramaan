import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { RepoIndex } from "../../src/core/static";

// A repository with many large source files, like the one that once exhausted the server's heap.
const root = fs.mkdtempSync(path.join(os.tmpdir(), "pramaan-big-repo-"));
const FILES = 120;
const filler = `${"x = 1\n".repeat(80_000)}`; // about 480 KB per file, about 58 MB in total
for (let i = 0; i < FILES; i++) fs.writeFileSync(path.join(root, `mod${i}.py`), filler);
fs.writeFileSync(path.join(root, "mod_target.py"), "def target_fn():\n    return 1\n");
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

describe("RepoIndex memory on large repositories", () => {
  it("searches every file without keeping their text in memory", () => {
    const index = new RepoIndex(root);
    const before = process.memoryUsage().heapUsed;
    expect(index.findDefinitions("target_fn")[0]).toMatchObject({ file: "mod_target.py", line: 1 });
    expect(index.findDefinitions("missing_symbol")).toEqual([]);
    expect(index.findMentions("missing_symbol")).toEqual([]);
    // Full caching would retain about 58 MB of strings plus array overhead; streaming retains almost nothing.
    global.gc?.();
    expect(process.memoryUsage().heapUsed - before).toBeLessThan(40_000_000);
  });

  it("keeps the evidence line cache bounded", () => {
    const index = new RepoIndex(root);
    for (let i = 0; i < FILES; i++) expect(index.lines(`mod${i}.py`)?.length).toBe(80_001);
    // @ts-expect-error reading private state to check the bound
    expect(index.cachedChars).toBeLessThanOrEqual(32_000_000);
    expect(index.lines("mod_target.py")?.[0]).toBe("def target_fn():");
  });
});
