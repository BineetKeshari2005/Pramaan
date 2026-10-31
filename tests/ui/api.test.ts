import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getJobStatus, startAnalysis } from "../../src/app/lib/api";

// ---------- Helpers ----------

function makeResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ---------- startAnalysis ----------

describe("startAnalysis", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the jobId on 202", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      makeResponse(202, { jobId: "abc123", status: "queued" }),
    );

    const result = await startAnalysis({ targetUrl: "https://github.com/o/r/issues/1" });
    expect(result.jobId).toBe("abc123");
    expect(result.status).toBe("queued");

    // Verify the request was POST to /api/analyze
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/api/analyze",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws with the server error message on 400", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      makeResponse(400, { error: "targetUrl is not a valid GitHub URL" }),
    );

    await expect(
      startAnalysis({ targetUrl: "not-a-url" }),
    ).rejects.toThrow("targetUrl is not a valid GitHub URL");
  });

  it("throws a generic message when server returns no error field", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeResponse(500, {}));

    await expect(
      startAnalysis({ targetUrl: "https://github.com/o/r/issues/1" }),
    ).rejects.toThrow("Request failed with status 500");
  });
});

// ---------- getJobStatus ----------

describe("getJobStatus", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the job on 200", async () => {
    const mockJob = {
      id: "job-1",
      status: "running",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:01.000Z",
      input: { targetUrl: "https://github.com/o/r/issues/1" },
      target: { owner: "o", repo: "r", number: 1, kind: "issue" },
      progress: [{ stage: "fetch", message: "Fetching o/r#1" }],
    };
    vi.mocked(fetch).mockResolvedValueOnce(makeResponse(200, mockJob));

    const result = await getJobStatus("job-1");
    expect(result.id).toBe("job-1");
    expect(result.status).toBe("running");
    expect(vi.mocked(fetch)).toHaveBeenCalledWith("/api/status/job-1");
  });

  it("throws with the server error message on 404", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      makeResponse(404, { error: "Job not found" }),
    );

    await expect(getJobStatus("unknown")).rejects.toThrow("Job not found");
  });

  it("throws a generic message on non-2xx without error field", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeResponse(503, {}));

    await expect(getJobStatus("job-1")).rejects.toThrow("Request failed with status 503");
  });
});
