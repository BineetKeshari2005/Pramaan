import { parseArgs } from "node:util";

export const USAGE = `Usage:
  pramaan check <github issue or pull request url> [options]
  pramaan render <report.json> [options]

Options:
  --commit <sha>                 Verify claims against this commit instead of the suggested one
  --format <json|markdown|reply> Output format (default: json for check, markdown for render)
  --out <file>                   Write the output to a file instead of stdout
  -h, --help                     Show this help`;

export type ReportFormat = "json" | "markdown" | "reply";

export type CliCommand =
  | { command: "help" }
  | {
      command: "check";
      url: string;
      commit?: string;
      out?: string;
      format: ReportFormat;
    }
  | {
      command: "render";
      file: string;
      out?: string;
      format: ReportFormat;
    };

export class CliArgsError extends Error {
  override name = "CliArgsError";
}

export function parseCliArgs(argv: string[]): CliCommand {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        commit: { type: "string" },
        out: { type: "string" },
        format: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
    });
  } catch (err) {
    throw new CliArgsError((err as Error).message);
  }
  const { values, positionals } = parsed;
  if (values.help || positionals.length === 0) return { command: "help" };

  if (values.format !== undefined) {
    if (
      values.format !== "json" &&
      values.format !== "markdown" &&
      values.format !== "reply"
    ) {
      throw new CliArgsError(
        `Invalid format: ${values.format}. Expected json, markdown, or reply`,
      );
    }
  }

  const [command, target, ...rest] = positionals;
  if (command === "check") {
    if (!target) throw new CliArgsError("check needs an issue or pull request URL");
    if (rest.length > 0) throw new CliArgsError(`Unexpected arguments: ${rest.join(" ")}`);
    const format: ReportFormat = (values.format as ReportFormat) ?? "json";
    return { command: "check", url: target, commit: values.commit, out: values.out, format };
  }

  if (command === "render") {
    if (!target) throw new CliArgsError("render needs a report JSON file path");
    if (values.commit !== undefined) throw new CliArgsError("--commit is not supported for render");
    if (rest.length > 0) throw new CliArgsError(`Unexpected arguments: ${rest.join(" ")}`);
    const format: ReportFormat = (values.format as ReportFormat) ?? "markdown";
    return { command: "render", file: target, out: values.out, format };
  }

  throw new CliArgsError(`Unknown command: ${command}`);
}
