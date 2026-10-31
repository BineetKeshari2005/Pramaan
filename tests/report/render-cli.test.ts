import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = path.resolve(__dirname, "../..");
const cliPath = path.join(rootDir, "src/cli/index.ts");
const sampleReportPath = path.join(
  rootDir,
  "tests/fixtures/reports/sample-report.json",
);

describe("CLI render command", () => {
  it("renders markdown from a saved report file", () => {
    const stdout = execFileSync(
      "npx",
      ["tsx", cliPath, "render", sampleReportPath, "--format", "markdown"],
      {
        cwd: rootDir,
        encoding: "utf8",
      },
    );

    expect(stdout).toContain(
      "# Pramaan evidence report: acme-org/widget-engine#[42](https://github.com/acme-org/widget-engine/issues/42)",
    );
    expect(stdout).toContain(
      "| # | Claim | Verdict | Confidence | Human review |",
    );
    expect(stdout).toContain("Widget.render() throws a TypeError");
  });

  it("renders reporter reply from a saved report file", () => {
    const stdout = execFileSync(
      "npx",
      ["tsx", cliPath, "render", sampleReportPath, "--format", "reply"],
      {
        cwd: rootDir,
        encoding: "utf8",
      },
    );

    expect(stdout).toContain(
      "Thank you for opening this report! Pramaan ran automated checks",
    );
    expect(stdout).toContain(
      "This reply was drafted by Pramaan, an automated evidence check; a maintainer will review the issue.",
    );
  });

  it("writes output to file when --out is specified", () => {
    const tmpOut = path.join(os.tmpdir(), `pramaan-out-${Date.now()}.md`);
    try {
      execFileSync(
        "npx",
        [
          "tsx",
          cliPath,
          "render",
          sampleReportPath,
          "--format",
          "markdown",
          "--out",
          tmpOut,
        ],
        {
          cwd: rootDir,
          encoding: "utf8",
        },
      );

      expect(fs.existsSync(tmpOut)).toBe(true);
      const content = fs.readFileSync(tmpOut, "utf8");
      expect(content).toContain("# Pramaan evidence report:");
    } finally {
      if (fs.existsSync(tmpOut)) {
        fs.unlinkSync(tmpOut);
      }
    }
  });

  it("exits with code 1 for a broken JSON file", () => {
    const tmpBroken = path.join(
      os.tmpdir(),
      `pramaan-broken-${Date.now()}.json`,
    );
    fs.writeFileSync(tmpBroken, "{ this is not valid json");

    try {
      execFileSync("npx", ["tsx", cliPath, "render", tmpBroken], {
        cwd: rootDir,
        encoding: "utf8",
        stdio: "pipe",
      });
      expect.unreachable("Command should have failed with exit code 1");
    } catch (err: any) {
      expect(err.status).toBe(1);
      const stderr = err.stderr?.toString() || "";
      expect(stderr).toContain("Invalid JSON");
    } finally {
      if (fs.existsSync(tmpBroken)) {
        fs.unlinkSync(tmpBroken);
      }
    }
  });

  it("exits with code 1 for an invalid report schema", () => {
    const tmpInvalid = path.join(
      os.tmpdir(),
      `pramaan-invalid-schema-${Date.now()}.json`,
    );
    fs.writeFileSync(tmpInvalid, JSON.stringify({ notA: "report" }));

    try {
      execFileSync("npx", ["tsx", cliPath, "render", tmpInvalid], {
        cwd: rootDir,
        encoding: "utf8",
        stdio: "pipe",
      });
      expect.unreachable("Command should have failed with exit code 1");
    } catch (err: any) {
      expect(err.status).toBe(1);
      const stderr = err.stderr?.toString() || "";
      expect(stderr).toContain("Invalid report schema");
    } finally {
      if (fs.existsSync(tmpInvalid)) {
        fs.unlinkSync(tmpInvalid);
      }
    }
  });
});
