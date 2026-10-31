// Saves a real GitHub issue or pull request as a TargetDocument JSON file.
// Usage: npx tsx scripts/fetch-target.ts <issue-or-pr-url> <out.json>
import { existsSync, writeFileSync } from "node:fs";
import { parseTargetUrl } from "../src/core/target";
import { createGitHubClientFromEnv } from "../src/core/github";

const [url, out] = process.argv.slice(2);
if (!url || !out) {
  console.error("Usage: npx tsx scripts/fetch-target.ts <issue-or-pr-url> <out.json>");
  process.exit(1);
}
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const doc = await createGitHubClientFromEnv().fetchTarget(parseTargetUrl(url));
writeFileSync(out, `${JSON.stringify({ sourceUrl: url, fetchedAt: new Date().toISOString(), ...doc }, null, 2)}\n`);
console.error(`Saved ${doc.ref.kind} "${doc.title}" to ${out}`);
