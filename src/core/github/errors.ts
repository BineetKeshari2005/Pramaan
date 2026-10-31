export class TargetNotFoundError extends Error {
  override name = "TargetNotFoundError";
  constructor(message: string) {
    super(message);
  }
}

export class GitHubRateLimitError extends Error {
  override name = "GitHubRateLimitError";
  constructor(
    message = "GitHub API rate limit exceeded. Set GITHUB_TOKEN in .env.local to increase your rate limit.",
  ) {
    super(message);
  }
}

export class CheckoutError extends Error {
  override name = "CheckoutError";
  readonly stderr: string;

  constructor(message: string, stderr = "") {
    super(stderr && !message.includes(stderr) ? `${message}\n${stderr}` : message);
    this.stderr = stderr;
  }
}

export function handleOctokitError(
  err: unknown,
  ref?: { owner: string; repo: string; number: number; kind: string },
): never {
  if (
    err instanceof TargetNotFoundError ||
    err instanceof GitHubRateLimitError ||
    err instanceof CheckoutError
  ) {
    throw err;
  }

  if (typeof err === "object" && err !== null && "status" in err) {
    const status = (err as { status: number }).status;
    const response = (
      err as { response?: { headers?: Record<string, string | number | undefined> } }
    ).response;
    const directHeaders = (err as { headers?: Record<string, string | number | undefined> })
      .headers;
    const headers = response?.headers ?? directHeaders ?? {};

    const remaining = headers["x-ratelimit-remaining"];
    if ((status === 403 || status === 429) && String(remaining) === "0") {
      throw new GitHubRateLimitError();
    }

    if (status === 404) {
      const targetStr = ref ? `${ref.owner}/${ref.repo}#${ref.number}` : "target";
      throw new TargetNotFoundError(`GitHub ${ref?.kind ?? "target"} not found: ${targetStr}`);
    }
  }

  throw err;
}
