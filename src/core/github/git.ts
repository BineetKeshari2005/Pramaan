import { execFile } from "node:child_process";
import { CheckoutError } from "./errors";

export type GitRunner = (args: string[], opts?: { cwd?: string }) => Promise<{ stdout: string }>;

export const COMMIT_REGEX = /^[A-Za-z0-9._\/-]{1,100}$/;

export function validateCommit(commit: string): void {
  if (commit.startsWith("-") || !COMMIT_REGEX.test(commit)) {
    throw new CheckoutError(`Invalid commit: ${commit}`);
  }
}

export function getGitSecurityFlags(allowFileProtocol = false): string[] {
  return [
    "-c",
    "core.hooksPath=/dev/null",
    "-c",
    "core.symlinks=false",
    "-c",
    allowFileProtocol ? "protocol.file.allow=always" : "protocol.file.allow=never",
  ];
}

export const defaultGitRunner: GitRunner = async (args, opts) => {
  return new Promise<{ stdout: string }>((resolve, reject) => {
    execFile(
      "git",
      args,
      {
        cwd: opts?.cwd,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: "0",
        },
        timeout: 120_000,
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          const stderrText = String(stderr ?? "");
          reject(new CheckoutError(`Git command failed: ${error.message}`, stderrText));
          return;
        }
        resolve({ stdout: String(stdout ?? "") });
      },
    );
  });
};
