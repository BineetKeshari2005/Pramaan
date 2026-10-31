import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { parseTargetUrl } from "../src/core/target";
import type { Dataset, EvalCase } from "./schema";

function resolveToken(): string | undefined {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;

  // Try extracting from git credential helper
  try {
    const input = "protocol=https\nhost=github.com\n\n";
    const out = execSync("git credential fill", { input, encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] });
    for (const line of out.split("\n")) {
      if (line.startsWith("password=")) {
        return line.substring("password=".length).trim();
      }
    }
  } catch {
    // Ignore error if credentials not found
  }

  // Try extracting from gh auth token
  try {
    const out = execSync("gh auth token", { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }).trim();
    if (out) return out;
  } catch {
    // Ignore error if gh is not installed
  }

  return undefined;
}

interface VerifyResult {
  id: string;
  repoRef: string;
  reference: string;
  sourceLabel: string;
  state: string;
  closedAt: string;
  status: "OK" | "MISMATCH" | "ERROR";
  error?: string;
}

async function verifyCase(c: EvalCase, token?: string): Promise<VerifyResult> {
  const { owner, repo, number, kind } = parseTargetUrl(c.url);
  const repoRef = `${owner}/${repo}#${number}`;

  if (kind !== "issue") {
    return {
      id: c.id,
      repoRef,
      reference: c.reference,
      sourceLabel: c.sourceLabel,
      state: "unknown",
      closedAt: c.closedAt,
      status: "ERROR",
      error: `URL kind is not issue: ${kind}`,
    };
  }

  const headers: Record<string, string> = {
    "User-Agent": "pramaan-eval-verifier",
    Accept: "application/vnd.github.v3+json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${number}`;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      return {
        id: c.id,
        repoRef,
        reference: c.reference,
        sourceLabel: c.sourceLabel,
        state: `HTTP ${res.status}`,
        closedAt: c.closedAt,
        status: "ERROR",
        error: `GitHub API returned ${res.status} ${res.statusText}`,
      };
    }

    const data = (await res.json()) as {
      state: string;
      closed_at: string | null;
      labels: Array<{ name: string }>;
    };

    const actualState = data.state;
    const actualClosedAt = data.closed_at ?? "";
    const actualLabels = data.labels.map((l) => l.name);

    const isClosed = actualState === "closed";
    const hasLabel = actualLabels.includes(c.sourceLabel);
    const dateMatches = actualClosedAt === c.closedAt || actualClosedAt.startsWith(c.closedAt.slice(0, 10));

    if (!isClosed) {
      return {
        id: c.id,
        repoRef,
        reference: c.reference,
        sourceLabel: c.sourceLabel,
        state: actualState,
        closedAt: actualClosedAt,
        status: "MISMATCH",
        error: `Expected closed, got ${actualState}`,
      };
    }

    if (!hasLabel) {
      return {
        id: c.id,
        repoRef,
        reference: c.reference,
        sourceLabel: c.sourceLabel,
        state: actualState,
        closedAt: actualClosedAt,
        status: "MISMATCH",
        error: `Missing sourceLabel "${c.sourceLabel}". Actual labels: [${actualLabels.join(", ")}]`,
      };
    }

    if (!dateMatches) {
      return {
        id: c.id,
        repoRef,
        reference: c.reference,
        sourceLabel: c.sourceLabel,
        state: actualState,
        closedAt: actualClosedAt,
        status: "MISMATCH",
        error: `closedAt mismatch: expected ${c.closedAt}, got ${actualClosedAt}`,
      };
    }

    return {
      id: c.id,
      repoRef,
      reference: c.reference,
      sourceLabel: c.sourceLabel,
      state: actualState,
      closedAt: actualClosedAt,
      status: "OK",
    };
  } catch (err) {
    return {
      id: c.id,
      repoRef,
      reference: c.reference,
      sourceLabel: c.sourceLabel,
      state: "fetch-error",
      closedAt: c.closedAt,
      status: "ERROR",
      error: (err as Error).message,
    };
  }
}

async function main() {
  const datasetPath = path.resolve(import.meta.dirname, "dataset.json");
  if (!fs.existsSync(datasetPath)) {
    console.error(`Dataset not found at ${datasetPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(datasetPath, "utf-8");
  const dataset = JSON.parse(raw) as Dataset;

  const token = resolveToken();
  if (!token) {
    console.warn("⚠️ Warning: No GITHUB_TOKEN or gh credentials found. Rate limits may apply.");
  } else {
    console.log("✓ GitHub token detected.");
  }

  console.log(`Verifying ${dataset.cases.length} cases against GitHub API...\n`);

  const results: VerifyResult[] = [];
  for (const c of dataset.cases) {
    process.stdout.write(`Checking ${c.id}... `);
    const result = await verifyCase(c, token);
    results.push(result);
    console.log(result.status === "OK" ? "✓ OK" : `✗ ${result.status} (${result.error})`);
    // Brief delay to be polite to GitHub API
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log("\n" + "=".repeat(115));
  console.log(
    "ID".padEnd(28) +
      "Repo#".padEnd(36) +
      "Ref".padEnd(20) +
      "SourceLabel".padEnd(22) +
      "Result"
  );
  console.log("-".repeat(115));

  let failureCount = 0;
  for (const r of results) {
    const isOk = r.status === "OK";
    if (!isOk) failureCount++;
    const statusText = isOk ? "OK" : `FAIL: ${r.error}`;
    console.log(
      r.id.padEnd(28) +
        r.repoRef.padEnd(36) +
        r.reference.padEnd(20) +
        r.sourceLabel.padEnd(22) +
        statusText
    );
  }
  console.log("=".repeat(115));

  if (failureCount > 0) {
    console.error(`\n❌ Verification failed: ${failureCount} of ${results.length} cases had mismatches or errors.`);
    process.exit(1);
  } else {
    console.log(`\n✅ All ${results.length} cases verified successfully against live GitHub API!`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
