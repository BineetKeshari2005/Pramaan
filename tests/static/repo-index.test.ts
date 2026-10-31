import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { excerpt, RepoIndex } from "../../src/core/static";

const demo = join(import.meta.dirname, "../fixtures/repos/demo");
const index = new RepoIndex(demo);

describe("RepoIndex.findFile", () => {
  it("matches paths as reporters write them", () => {
    expect(index.findFile("src/url.py").path).toBe("src/url.py");
    expect(index.findFile("./src/url.py").path).toBe("src/url.py");
    expect(index.findFile("/home/alice/projects/demo/src/url.py").path).toBe("src/url.py");
    expect(index.findFile("C:\\work\\demo\\lib\\controller\\action.py").path).toBe("lib/controller/action.py");
    expect(index.findFile("src/url.py:12:4").path).toBe("src/url.py");
    expect(index.findFile("url.py").path).toBe("src/url.py");
  });

  it("does not match on a bare basename from a different directory, and suggests same-name files", () => {
    const miss = index.findFile("lib/url.py");
    expect(miss.path).toBeUndefined();
    expect(miss.similar).toEqual(["src/url.py"]);
  });
});

describe("RepoIndex.findDefinitions", () => {
  it.each([
    ["parse_url", "src/url.py", 8],
    ["UrlCache", "src/url.py", 16],
    ["lookup", "src/url.py", 17],
    ["renderPage", "web/app.js", 1],
    ["formatDate", "web/app.js", 5],
    ["Widget", "web/app.js", 7],
    ["render", "web/app.js", 8],
  ])("finds %s in %s line %i", (symbol, file, line) => {
    expect(index.findDefinitions(symbol)[0]).toMatchObject({ file, line });
  });

  it("does not report call sites as definitions", () => {
    expect(index.findDefinitions("singleString")).toEqual([]);
    expect(index.findMentions("singleString")[0]).toMatchObject({ file: "lib/controller/action.py", line: 7 });
  });
});

describe("excerpt", () => {
  it("numbers lines and clamps to the file", () => {
    expect(excerpt(["a", "b", "c"], 0, 9)).toBe("1 | a\n2 | b\n3 | c");
  });
});
