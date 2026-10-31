import { describe, expect, it } from "vitest";
import { DockerSandbox, MAX_OUTPUT_CHARS, type ProcessRunner } from "../../src/core/sandbox";

const spec = {
  image: "python:3.12-slim",
  repoDir: "/tmp/checkouts/acme__demo@0123456",
  command: ["python3", "-c", "print(1)"],
  timeoutMs: 5000,
  memoryMb: 512,
  cpus: 1,
};

function recorder(result = { code: 0 as number | null, stdout: "ok\n", stderr: "" }, delayMs = 0) {
  const calls: Array<{ file: string; args: string[]; timeoutMs: number }> = [];
  const run: ProcessRunner = async (file, args, opts) => {
    calls.push({ file, args, timeoutMs: opts.timeoutMs });
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    return args[0] === "run" ? result : { code: 0, stdout: "", stderr: "" };
  };
  return { run, calls };
}

describe("DockerSandbox isolation flags", () => {
  const args = new DockerSandbox().buildArgs(spec, "pramaan-test");
  const pair = (flag: string) => args.flatMap((a, i) => (a === flag ? [args[i + 1]] : []));

  it("cuts the network, makes everything read-only and drops privileges", () => {
    expect(pair("--network")).toEqual(["none"]);
    expect(args).toContain("--read-only");
    expect(pair("--mount")).toEqual([`type=bind,source=${spec.repoDir},target=/repo,readonly`]);
    expect(pair("--cap-drop")).toEqual(["ALL"]);
    expect(pair("--security-opt")).toEqual(["no-new-privileges"]);
    expect(pair("--user")).toEqual(["65534:65534"]);
  });

  it("caps memory (no swap), CPU, processes, open files and file size", () => {
    expect(pair("--memory")).toEqual(["512m"]);
    expect(pair("--memory-swap")).toEqual(["512m"]);
    expect(pair("--cpus")).toEqual(["1"]);
    expect(pair("--pids-limit")).toEqual(["128"]);
    expect(pair("--ulimit")).toEqual(["nofile=256:256", "fsize=67108864"]);
  });

  it("passes no host environment, only what the spec names, and runs the command after the image", () => {
    expect(pair("--env")).toEqual(["HOME=/tmp", "PYTHONDONTWRITEBYTECODE=1"]);
    expect(args.slice(-4)).toEqual(["python:3.12-slim", "python3", "-c", "print(1)"]);
    expect(args.join(" ")).not.toMatch(/GITHUB_TOKEN|privileged|--volume|docker\.sock/);
  });

  it("rejects unsafe images, paths and environment names", () => {
    const sb = new DockerSandbox();
    expect(() => sb.buildArgs({ ...spec, image: "--privileged" }, "n")).toThrow(/image/);
    expect(() => sb.buildArgs({ ...spec, repoDir: "relative/path" }, "n")).toThrow(/absolute/);
    expect(() => sb.buildArgs({ ...spec, repoDir: "/tmp/a,target=/etc" }, "n")).toThrow(/absolute/);
    expect(() => sb.buildArgs({ ...spec, env: { "BAD NAME": "x" } }, "n")).toThrow(/environment/);
  });
});

describe("DockerSandbox.run", () => {
  it("returns the exit code and output", async () => {
    const { run, calls } = recorder({ code: 3, stdout: "out", stderr: "err" });
    const result = await new DockerSandbox({ run }).run(spec);
    expect(result).toMatchObject({ exitCode: 3, stdout: "out", stderr: "err", timedOut: false });
    expect(calls[0]?.file).toBe("docker");
    expect(calls[0]?.timeoutMs).toBe(5000);
  });

  it("force-removes the container when the time limit is hit", async () => {
    const { run, calls } = recorder({ code: null, stdout: "", stderr: "killed" }, 60);
    const result = await new DockerSandbox({ run }).run({ ...spec, timeoutMs: 50 });
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBeNull();
    const name = calls[0]?.args[calls[0].args.indexOf("--name") + 1];
    expect(calls[1]?.args).toEqual(["rm", "--force", name]);
  });

  it("truncates huge output", async () => {
    const { run } = recorder({ code: 0, stdout: "x".repeat(MAX_OUTPUT_CHARS + 10), stderr: "" });
    const result = await new DockerSandbox({ run }).run(spec);
    expect(result.stdout.endsWith("[output truncated]")).toBe(true);
  });

  it("reports availability from `docker info`", async () => {
    const up: ProcessRunner = async () => ({ code: 0, stdout: "27.0.1\n", stderr: "" });
    const down: ProcessRunner = async () => ({ code: 1, stdout: "", stderr: "Cannot connect to the Docker daemon" });
    expect(await new DockerSandbox({ run: up }).isAvailable()).toBe(true);
    expect(await new DockerSandbox({ run: down }).isAvailable()).toBe(false);
  });
});
