import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "../../src/app/api/analyze/route";
import { GET } from "../../src/app/api/status/[id]/route";
import { ReportSchema } from "../../src/core/types";
import { setJobServiceForTests } from "../../src/server/jobs/default";
import { JobService } from "../../src/server/jobs/service";

function createFakeReport() {
  return ReportSchema.parse({
    target: {
      owner: "acme",
      repo: "widgets",
      number: 42,
      kind: "issue",
      url: "https://github.com/acme/widgets/issues/42",
      title: "Sample Issue",
      commit: "abc1234",
    },
    generatedAt: "2026-11-01T00:00:00Z",
    models: ["gemma-4"],
    extraction: { status: "ok", claimCount: 1 },
    assessments: [],
    triage: { label: "confirmed", rationale: "Reproduction confirmed" },
  });
}

describe("API Routes", () => {
  let service: JobService;

  beforeEach(() => {
    service = new JobService({
      analyze: async () => createFakeReport(),
    });
    setJobServiceForTests(service);
  });

  afterEach(() => {
    setJobServiceForTests(null);
  });

  describe("POST /api/analyze", () => {
    it("returns 202 with jobId and status for a valid request", async () => {
      const req = new Request("http://localhost:3000/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl: "https://github.com/acme/widgets/issues/42",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(202);

      const data = await res.json();
      expect(data).toEqual({
        jobId: expect.any(String),
        status: "queued",
      });
    });

    it("returns 400 for invalid JSON body", async () => {
      const req = new Request("http://localhost:3000/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json{{",
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe("Invalid JSON in request body");
    });

    it("returns 400 for invalid target URL", async () => {
      const req = new Request("http://localhost:3000/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl: "https://google.com/search",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain("Only github.com links are supported");
    });

    it("returns 400 for mismatched repoUrl", async () => {
      const req = new Request("http://localhost:3000/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl: "https://github.com/acme/widgets/issues/42",
          repoUrl: "https://github.com/other/widgets",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe("The issue link is not in the repository you entered");
    });
  });

  describe("GET /api/status/[id]", () => {
    it("returns 200 with JobView for an existing job", async () => {
      const submitted = service.submit({
        targetUrl: "https://github.com/acme/widgets/issues/42",
      });

      const req = new Request(`http://localhost:3000/api/status/${submitted.id}`);
      const res = await GET(req, {
        params: Promise.resolve({ id: submitted.id }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe(submitted.id);
      expect(["queued", "running", "done"]).toContain(data.status);
      expect(data.target).toEqual({
        owner: "acme",
        repo: "widgets",
        number: 42,
        kind: "issue",
      });
    });

    it("returns 404 for a non-existent job ID", async () => {
      const req = new Request("http://localhost:3000/api/status/does-not-exist");
      const res = await GET(req, {
        params: Promise.resolve({ id: "does-not-exist" }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toEqual({ error: "Job not found" });
    });

    it("returns 404 for an invalid / malicious job ID (path traversal)", async () => {
      const req = new Request("http://localhost:3000/api/status/../../etc/passwd");
      const res = await GET(req, {
        params: Promise.resolve({ id: "../../etc/passwd" }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toEqual({ error: "Job not found" });
    });
  });
});
