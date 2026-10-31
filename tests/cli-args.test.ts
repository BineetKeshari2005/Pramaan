import { describe, expect, it } from "vitest";
import { CliArgsError, parseCliArgs } from "../src/cli/args";

describe("parseCliArgs", () => {
  it("shows help with no arguments or -h", () => {
    expect(parseCliArgs([])).toEqual({ command: "help" });
    expect(parseCliArgs(["-h"])).toEqual({ command: "help" });
  });

  it("parses check with options", () => {
    expect(
      parseCliArgs([
        "check",
        "https://github.com/a/b/issues/1",
        "--commit",
        "abc",
        "--out",
        "r.json",
      ]),
    ).toEqual({
      command: "check",
      url: "https://github.com/a/b/issues/1",
      commit: "abc",
      out: "r.json",
      format: "json",
    });
  });

  it("parses check with explicit format", () => {
    expect(
      parseCliArgs([
        "check",
        "https://github.com/a/b/issues/1",
        "--format",
        "markdown",
      ]),
    ).toEqual({
      command: "check",
      url: "https://github.com/a/b/issues/1",
      format: "markdown",
    });

    expect(
      parseCliArgs([
        "check",
        "https://github.com/a/b/issues/1",
        "--format",
        "reply",
      ]),
    ).toEqual({
      command: "check",
      url: "https://github.com/a/b/issues/1",
      format: "reply",
    });
  });

  it("parses render with options", () => {
    expect(parseCliArgs(["render", "report.json"])).toEqual({
      command: "render",
      file: "report.json",
      format: "markdown",
    });

    expect(
      parseCliArgs([
        "render",
        "report.json",
        "--format",
        "reply",
        "--out",
        "reply.txt",
      ]),
    ).toEqual({
      command: "render",
      file: "report.json",
      format: "reply",
      out: "reply.txt",
    });
  });

  it.each([
    [["frobnicate"]],
    [["check"]],
    [["check", "u", "extra"]],
    [["check", "u", "--nope"]],
    [["check", "u", "--format", "invalid"]],
    [["render"]],
    [["render", "r.json", "extra"]],
    [["render", "r.json", "--commit", "sha"]],
    [["render", "r.json", "--format", "yaml"]],
  ])("rejects %j", (argv) => {
    expect(() => parseCliArgs(argv)).toThrow(CliArgsError);
  });
});
