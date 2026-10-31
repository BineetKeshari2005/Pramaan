import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { type Report, ReportSchema, parseTargetUrl, runPipeline } from "../core";
import { buildReporterReply, renderReportMarkdown } from "../core/report";
import { type CliCommand, type ReportFormat, USAGE, parseCliArgs } from "./args";
import { createDeps } from "./deps";

function formatReport(
  report: Report,
  format: ReportFormat,
): { content?: string; noReplyNeeded?: boolean } {
  if (format === "markdown") {
    return { content: renderReportMarkdown(report) };
  }
  if (format === "reply") {
    const reply = buildReporterReply(report);
    if (reply === null) {
      return { noReplyNeeded: true };
    }
    return { content: reply };
  }
  return { content: JSON.stringify(report, null, 2) };
}

function outputFormatted(
  result: { content?: string; noReplyNeeded?: boolean },
  out?: string,
): number {
  if (result.noReplyNeeded) {
    console.error("No reply needed: the report has no open questions for the reporter.");
    return 0;
  }
  const text = result.content ?? "";
  if (out) {
    writeFileSync(out, `${text}\n`);
    console.error(`Report written to ${out}`);
  } else {
    console.log(text);
  }
  return 0;
}

async function main(argv: string[]): Promise<number> {
  const cmd = parseCliArgs(argv);
  if (cmd.command === "help") {
    console.log(USAGE);
    return 0;
  }

  if (cmd.command === "render") {
    if (!existsSync(cmd.file)) {
      console.error(`File not found: ${cmd.file}`);
      return 1;
    }
    let raw: string;
    try {
      raw = readFileSync(cmd.file, "utf8");
    } catch (err) {
      console.error(`Failed to read file ${cmd.file}: ${(err as Error).message}`);
      return 1;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch (err) {
      console.error(`Invalid JSON in ${cmd.file}: ${(err as Error).message}`);
      return 1;
    }

    let report: Report;
    try {
      report = ReportSchema.parse(parsedJson);
    } catch (err) {
      console.error(`Invalid report schema in ${cmd.file}: ${(err as Error).message}`);
      return 1;
    }

    const formatted = formatReport(report, cmd.format);
    return outputFormatted(formatted, cmd.out);
  }

  // command === "check"
  // GITHUB_TOKEN lives in the gitignored .env.local; Next.js loads it for the web app, the CLI does it here.
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const ref = parseTargetUrl(cmd.url);
  const report = await runPipeline(ref, createDeps(), {
    commit: cmd.commit,
    onProgress: (e) => console.error(`[${e.stage}] ${e.message}`),
  });

  const formatted = formatReport(report, cmd.format);
  return outputFormatted(formatted, cmd.out);
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err: Error) => {
    console.error(`pramaan: ${err.message}`);
    process.exit(1);
  },
);
