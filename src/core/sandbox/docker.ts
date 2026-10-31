import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";
import type { Sandbox, SandboxResult, SandboxSpec } from "../ports";

export interface ExecResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/** Runs a program without a shell. Injectable so tests can check the exact docker arguments. */
export type ProcessRunner = (file: string, args: string[], opts: { timeoutMs: number }) => Promise<ExecResult>;

export const MAX_OUTPUT_CHARS = 64_000;

export const defaultProcessRunner: ProcessRunner = (file, args, opts) =>
  new Promise((resolve) => {
    execFile(file, args, { timeout: opts.timeoutMs, maxBuffer: 8 * 1024 * 1024, killSignal: "SIGKILL" }, (error, stdout, stderr) => {
      const code = error ? (typeof error.code === "number" ? error.code : null) : 0;
      resolve({ code, stdout: String(stdout ?? ""), stderr: String(stderr ?? "") || (error && code === null ? error.message : "") });
    });
  });

const ENV_NAME = /^[A-Z_][A-Z0-9_]{0,63}$/;
const IMAGE = /^[a-z0-9][a-z0-9._/-]*(?::[A-Za-z0-9._-]+)?(?:@sha256:[a-f0-9]{64})?$/;

export interface DockerSandboxOptions {
  run?: ProcessRunner;
  docker?: string;
}

/**
 * Runs untrusted code (snippets from reports, a repository's own tests) in a throwaway container:
 * no network, read-only root filesystem, the repository mounted read-only, all capabilities
 * dropped, no privilege escalation, an unprivileged user, and hard CPU, memory, process and
 * wall-clock limits. Nothing from the host is passed in except the read-only checkout.
 */
export class DockerSandbox implements Sandbox {
  private readonly runProcess: ProcessRunner;
  private readonly docker: string;
  private available: Promise<boolean> | undefined;

  constructor(options: DockerSandboxOptions = {}) {
    this.runProcess = options.run ?? defaultProcessRunner;
    this.docker = options.docker ?? "docker";
  }

  isAvailable(): Promise<boolean> {
    this.available ??= this.runProcess(this.docker, ["info", "--format", "{{.ServerVersion}}"], { timeoutMs: 10_000 }).then(
      (r) => r.code === 0 && r.stdout.trim().length > 0,
      () => false,
    );
    return this.available;
  }

  /** The exact `docker run` arguments for a spec, exported for review and tests. */
  buildArgs(spec: SandboxSpec, name: string): string[] {
    if (!IMAGE.test(spec.image)) throw new Error(`Refusing unexpected sandbox image name: ${spec.image}`);
    if (!path.isAbsolute(spec.repoDir) || spec.repoDir.includes(",") || spec.repoDir.includes(":")) {
      throw new Error(`Sandbox repository path must be an absolute path without ',' or ':': ${spec.repoDir}`);
    }
    const memory = `${Math.max(64, Math.floor(spec.memoryMb))}m`;
    const env = Object.entries(spec.env ?? {}).flatMap(([k, v]) => {
      if (!ENV_NAME.test(k)) throw new Error(`Invalid sandbox environment variable name: ${k}`);
      return ["--env", `${k}=${v}`];
    });
    return [
      "run",
      "--rm",
      "--name", name,
      "--network", "none",
      "--read-only",
      "--tmpfs", "/tmp:rw,nosuid,nodev,size=64m,mode=1777",
      "--tmpfs", "/work:rw,exec,nosuid,nodev,size=256m,mode=1777",
      "--mount", `type=bind,source=${spec.repoDir},target=/repo,readonly`,
      "--memory", memory,
      "--memory-swap", memory,
      "--cpus", String(Math.max(0.1, spec.cpus)),
      "--pids-limit", "128",
      "--cap-drop", "ALL",
      "--security-opt", "no-new-privileges",
      "--user", "65534:65534",
      "--ulimit", "nofile=256:256",
      "--ulimit", "fsize=67108864",
      "--env", "HOME=/tmp",
      "--env", "PYTHONDONTWRITEBYTECODE=1",
      ...env,
      "--workdir", spec.workdir ?? "/repo",
      "--entrypoint", "",
      spec.image,
      ...spec.command,
    ];
  }

  async run(spec: SandboxSpec): Promise<SandboxResult> {
    const name = `pramaan-${randomBytes(6).toString("hex")}`;
    const started = Date.now();
    const result = await this.runProcess(this.docker, this.buildArgs(spec, name), { timeoutMs: spec.timeoutMs });
    const durationMs = Date.now() - started;
    const timedOut = result.code === null && durationMs >= spec.timeoutMs - 50;
    if (timedOut) {
      // Killing the docker CLI does not stop the container; remove it explicitly.
      await this.runProcess(this.docker, ["rm", "--force", name], { timeoutMs: 15_000 }).catch(() => undefined);
    }
    return {
      exitCode: timedOut ? null : result.code,
      stdout: truncate(result.stdout),
      stderr: truncate(result.stderr),
      timedOut,
      durationMs,
    };
  }
}

function truncate(s: string): string {
  return s.length > MAX_OUTPUT_CHARS ? `${s.slice(0, MAX_OUTPUT_CHARS)}\n… [output truncated]` : s;
}
