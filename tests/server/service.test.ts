import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { ProgressEvent } from "../../src/core/pipeline";
import type { TargetRef } from "../../src/core/ports";
import { type Report, ReportSchema } from "../../src/core/types";
import { JobService } from "../../src/server/jobs/service";
import { type AnalyzeRequest, JobInputError } from "../../src/server/jobs/types";

function createSampleReport(overrides: Partial<Report> = {}): Report {
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
    ...overrides,
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("JobService", () => {
  it("valid submit returns queued and later done with the report", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-service-test-"));
    const report = createSampleReport();

    try {
      const analyze = vi.fn(async () => report);
      const service = new JobService({
        analyze,
        dataDir: tmpDir,
      });

      const submitted = service.submit({
        targetUrl: "https://github.com/acme/widgets/issues/42",
      });

      expect(submitted.status).toBe("queued");
      expect(submitted.target).toEqual({
        owner: "acme",
        repo: "widgets",
        number: 42,
        kind: "issue",
      });
      expect(submitted.queuePosition).toBe(1);

      // Wait for the job to complete
      await vi.waitFor(
        () => {
          const job = service.get(submitted.id);
          expect(job?.status).toBe("done");
          expect(job?.report).toEqual(report);
          expect(job?.queuePosition).toBeUndefined();
        },
        { timeout: 2000 },
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("invalid targetUrl and mismatched repoUrl throw JobInputError", () => {
    const service = new JobService({
      analyze: async () => createSampleReport(),
    });

    // Invalid targetUrl
    expect(() => service.submit({ targetUrl: "not-a-url" })).toThrow(JobInputError);
    expect(() => service.submit({ targetUrl: "https://google.com/search" })).toThrow(
      JobInputError,
    );
    expect(() => service.submit({ targetUrl: "" })).toThrow(JobInputError);
    expect(() => service.submit({ targetUrl: "   " })).toThrow(JobInputError);

    // Mismatched repoUrl
    expect(() =>
      service.submit({
        targetUrl: "https://github.com/acme/widgets/issues/42",
        repoUrl: "https://github.com/other/widgets",
      }),
    ).toThrow("The issue link is not in the repository you entered");

    // Case-insensitive match should NOT throw
    expect(() =>
      service.submit({
        targetUrl: "https://github.com/acme/widgets/issues/42",
        repoUrl: "https://github.com/ACME/WIDGETS",
      }),
    ).not.toThrow();
  });

  it("rejects commits like --upload-pack=x and malformed commits", () => {
    const service = new JobService({
      analyze: async () => createSampleReport(),
    });

    expect(() =>
      service.submit({
        targetUrl: "https://github.com/acme/widgets/issues/42",
        commit: "--upload-pack=x",
      }),
    ).toThrow(JobInputError);

    expect(() =>
      service.submit({
        targetUrl: "https://github.com/acme/widgets/issues/42",
        commit: "a;rm -rf",
      }),
    ).toThrow(JobInputError);

    expect(() =>
      service.submit({
        targetUrl: "https://github.com/acme/widgets/issues/42",
        commit: "a".repeat(101),
      }),
    ).toThrow(JobInputError);
  });

  it("dedup returns the same job id for active jobs", async () => {
    const def = deferred<Report>();
    const analyze = vi.fn(async () => def.promise);
    const service = new JobService({ analyze });

    const job1 = service.submit({
      targetUrl: "https://github.com/acme/widgets/issues/42",
      commit: "main",
    });

    const job2 = service.submit({
      targetUrl: "https://github.com/acme/widgets/issues/42",
      commit: "main",
    });

    expect(job2.id).toBe(job1.id);

    def.resolve(createSampleReport());
    await vi.waitFor(() => {
      expect(service.get(job1.id)?.status).toBe("done");
    });
  });

  it("runs at most ONE job at a time, FIFO with queuePosition", async () => {
    const def1 = deferred<Report>();
    const def2 = deferred<Report>();

    const analyze = vi.fn(async (input: AnalyzeRequest) => {
      if (input.targetUrl.endsWith("/1")) return def1.promise;
      if (input.targetUrl.endsWith("/2")) return def2.promise;
      return createSampleReport();
    });

    const service = new JobService({ analyze });

    const job1 = service.submit({ targetUrl: "https://github.com/acme/widgets/issues/1" });
    const job2 = service.submit({ targetUrl: "https://github.com/acme/widgets/issues/2" });
    const job3 = service.submit({ targetUrl: "https://github.com/acme/widgets/issues/3" });

    // Allow microtask to run so job1 starts running
    await vi.waitFor(() => {
      expect(service.get(job1.id)?.status).toBe("running");
    });

    expect(service.get(job1.id)?.queuePosition).toBeUndefined();
    expect(service.get(job2.id)?.status).toBe("queued");
    expect(service.get(job2.id)?.queuePosition).toBe(1);
    expect(service.get(job3.id)?.status).toBe("queued");
    expect(service.get(job3.id)?.queuePosition).toBe(2);

    // Complete job 1
    def1.resolve(createSampleReport());

    // Job 2 should now start running, Job 3 moves to queuePosition 1
    await vi.waitFor(() => {
      expect(service.get(job1.id)?.status).toBe("done");
      expect(service.get(job2.id)?.status).toBe("running");
    });

    expect(service.get(job2.id)?.queuePosition).toBeUndefined();
    expect(service.get(job3.id)?.status).toBe("queued");
    expect(service.get(job3.id)?.queuePosition).toBe(1);

    // Complete job 2
    def2.resolve(createSampleReport());

    // Job 3 should now complete
    await vi.waitFor(() => {
      expect(service.get(job3.id)?.status).toBe("done");
    });
  });

  it("failing analyze marks the job failed with message and queue continues", async () => {
    const analyze = vi.fn(async (input: AnalyzeRequest) => {
      if (input.targetUrl.endsWith("/13")) {
        throw new Error("Out of memory in sandbox");
      }
      return createSampleReport();
    });

    const service = new JobService({ analyze });

    const failedJob = service.submit({
      targetUrl: "https://github.com/acme/widgets/issues/13",
    });
    const nextJob = service.submit({
      targetUrl: "https://github.com/acme/widgets/issues/14",
    });

    await vi.waitFor(() => {
      const j1 = service.get(failedJob.id);
      expect(j1?.status).toBe("failed");
      expect(j1?.error).toBe("Out of memory in sandbox");
      expect(j1?.error).not.toMatch(/\bat\s+/); // No stack trace
    });

    await vi.waitFor(() => {
      const j2 = service.get(nextJob.id);
      expect(j2?.status).toBe("done");
    });
  });

  it("progress events are recorded and capped at 100", async () => {
    const analyze = vi.fn(
      async (
        _input: AnalyzeRequest,
        _ref: TargetRef,
        onProgress: (e: ProgressEvent) => void,
      ) => {
        for (let i = 0; i < 110; i++) {
          onProgress({ stage: "verify", message: `Step ${i}` });
        }
        return createSampleReport();
      },
    );

    const service = new JobService({ analyze });
    const job = service.submit({
      targetUrl: "https://github.com/acme/widgets/issues/100",
    });

    await vi.waitFor(() => {
      const j = service.get(job.id);
      expect(j?.status).toBe("done");
      expect(j?.progress).toHaveLength(100);
      expect(j?.progress[0]?.message).toBe("Step 10");
      expect(j?.progress[99]?.message).toBe("Step 109");
    });
  });

  it("finished job is written to dataDir and a NEW JobService instance can get() it", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-persistence-test-"));
    const report = createSampleReport();

    try {
      const service1 = new JobService({
        analyze: async () => report,
        dataDir: tmpDir,
      });

      const submitted = service1.submit({
        targetUrl: "https://github.com/acme/widgets/issues/42",
      });

      await vi.waitFor(() => {
        expect(service1.get(submitted.id)?.status).toBe("done");
      });

      // Verify file exists on disk
      const filePath = path.join(tmpDir, `${submitted.id}.json`);
      expect(fs.existsSync(filePath)).toBe(true);

      // Create a brand new JobService instance pointing to the same dataDir
      const service2 = new JobService({
        analyze: async () => report,
        dataDir: tmpDir,
      });

      const reloaded = service2.get(submitted.id);
      expect(reloaded).toBeDefined();
      expect(reloaded?.id).toBe(submitted.id);
      expect(reloaded?.status).toBe("done");
      expect(reloaded?.report).toEqual(report);
      expect(reloaded?.target).toEqual({
        owner: "acme",
        repo: "widgets",
        number: 42,
        kind: "issue",
      });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("malicious id like ../../etc/passwd is never used as a file path", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-security-test-"));
    try {
      const existsSpy = vi.spyOn(fs, "existsSync");
      const service = new JobService({
        analyze: async () => createSampleReport(),
        dataDir: tmpDir,
      });

      const result = service.get("../../etc/passwd");
      expect(result).toBeUndefined();

      const callsWithPath = existsSpy.mock.calls.filter(([arg]) =>
        String(arg).includes("passwd"),
      );
      expect(callsWithPath).toHaveLength(0);

      existsSpy.mockRestore();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
