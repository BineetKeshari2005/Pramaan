import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ProgressEvent } from "../../core/pipeline";
import type { RepoRef, TargetRef } from "../../core/ports";
import { TargetUrlError, parseRepoUrl, parseTargetUrl } from "../../core/target";
import type { Report } from "../../core/types";
import {
  type AnalyzeRequest,
  AnalyzeRequestSchema,
  JobInputError,
  type JobStatus,
  type JobTarget,
  type JobView,
} from "./types";

export interface JobServiceOptions {
  analyze: (
    input: AnalyzeRequest,
    ref: TargetRef,
    onProgress: (e: ProgressEvent) => void,
  ) => Promise<Report>;
  dataDir?: string;
  now?: () => Date;
  idFactory?: () => string;
}

interface JobRecord {
  id: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  input: AnalyzeRequest;
  targetRef: TargetRef;
  target: JobTarget;
  progress: ProgressEvent[];
  report?: Report;
  error?: string;
}

const SAFE_ID_REGEX = /^[A-Za-z0-9-]{1,64}$/;

export class JobService {
  private readonly analyze: (
    input: AnalyzeRequest,
    ref: TargetRef,
    onProgress: (e: ProgressEvent) => void,
  ) => Promise<Report>;
  private readonly dataDir: string;
  private readonly now: () => Date;
  private readonly idFactory: () => string;

  private readonly jobs = new Map<string, JobRecord>();
  private readonly queuedJobs: JobRecord[] = [];
  private runningJob: JobRecord | null = null;

  constructor(options: JobServiceOptions) {
    this.analyze = options.analyze;
    this.dataDir = options.dataDir ?? ".pramaan/jobs";
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? (() => crypto.randomUUID());
  }

  submit(request: unknown): JobView {
    const parsed = AnalyzeRequestSchema.safeParse(request);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Invalid input";
      throw new JobInputError(msg);
    }
    const input = parsed.data;

    let targetRef: TargetRef;
    try {
      targetRef = parseTargetUrl(input.targetUrl);
    } catch (err: unknown) {
      if (err instanceof TargetUrlError) {
        throw new JobInputError(err.message);
      }
      throw new JobInputError("Invalid target URL");
    }

    if (input.repoUrl) {
      let repoRef: RepoRef;
      try {
        repoRef = parseRepoUrl(input.repoUrl);
      } catch (err: unknown) {
        if (err instanceof TargetUrlError) {
          throw new JobInputError(err.message);
        }
        throw new JobInputError("Invalid repository URL");
      }

      if (
        repoRef.owner.toLowerCase() !== targetRef.owner.toLowerCase() ||
        repoRef.repo.toLowerCase() !== targetRef.repo.toLowerCase()
      ) {
        throw new JobInputError("The issue link is not in the repository you entered");
      }
    }

    // Deduplication: if a queued or running job exists with the same targetUrl and commit, return that job
    const sameTarget = (job: JobRecord) =>
      job.input.targetUrl === input.targetUrl &&
      (job.input.commit ?? undefined) === (input.commit ?? undefined);

    if (this.runningJob && sameTarget(this.runningJob)) {
      return this.toJobView(this.runningJob);
    }

    const existingQueued = this.queuedJobs.find(sameTarget);
    if (existingQueued) {
      return this.toJobView(existingQueued);
    }

    const id = this.idFactory();
    const nowStr = this.now().toISOString();
    const job: JobRecord = {
      id,
      status: "queued",
      createdAt: nowStr,
      updatedAt: nowStr,
      input,
      targetRef,
      target: {
        owner: targetRef.owner,
        repo: targetRef.repo,
        number: targetRef.number,
        kind: targetRef.kind,
      },
      progress: [],
    };

    this.jobs.set(id, job);
    this.queuedJobs.push(job);

    // Schedule processing asynchronously so submit() returns with status "queued"
    queueMicrotask(() => {
      this.processQueue();
    });

    return this.toJobView(job);
  }

  get(id: string): JobView | undefined {
    const inMemory = this.jobs.get(id);
    if (inMemory) {
      return this.toJobView(inMemory);
    }

    if (!SAFE_ID_REGEX.test(id)) {
      return undefined;
    }

    const filePath = path.join(this.dataDir, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      return undefined;
    }

    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw) as JobView;
      const record: JobRecord = {
        id: parsed.id,
        status: parsed.status,
        createdAt: parsed.createdAt,
        updatedAt: parsed.updatedAt,
        input: parsed.input,
        targetRef: {
          owner: parsed.target.owner,
          repo: parsed.target.repo,
          number: parsed.target.number,
          kind: parsed.target.kind,
        },
        target: parsed.target,
        progress: parsed.progress ?? [],
        report: parsed.report,
        error: parsed.error,
      };
      this.jobs.set(id, record);
      return this.toJobView(record);
    } catch {
      return undefined;
    }
  }

  private async processQueue(): Promise<void> {
    if (this.runningJob !== null) {
      return;
    }

    const job = this.queuedJobs.shift();
    if (!job) {
      return;
    }

    this.runningJob = job;
    job.status = "running";
    job.updatedAt = this.now().toISOString();

    try {
      const onProgress = (event: ProgressEvent) => {
        job.progress.push(event);
        if (job.progress.length > 100) {
          job.progress.shift();
        }
        job.updatedAt = this.now().toISOString();
      };

      const report = await this.analyze(job.input, job.targetRef, onProgress);
      job.status = "done";
      job.report = report;
      job.updatedAt = this.now().toISOString();
    } catch (err: unknown) {
      job.status = "failed";
      job.error = err instanceof Error ? err.message : String(err);
      job.updatedAt = this.now().toISOString();
    } finally {
      this.writeJobToDisk(job);
      this.runningJob = null;
      queueMicrotask(() => {
        this.processQueue();
      });
    }
  }

  private writeJobToDisk(job: JobRecord): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const filePath = path.join(this.dataDir, `${job.id}.json`);
      const view = this.toJobView(job);
      fs.writeFileSync(filePath, JSON.stringify(view, null, 2), "utf8");
    } catch {
      // Disk write failures should not crash the queue
    }
  }

  private toJobView(job: JobRecord): JobView {
    let queuePosition: number | undefined;
    if (job.status === "queued") {
      const idx = this.queuedJobs.findIndex((j) => j.id === job.id);
      if (idx !== -1) {
        queuePosition = idx + 1;
      }
    }

    const view: JobView = {
      id: job.id,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      input: job.input,
      target: {
        owner: job.target.owner,
        repo: job.target.repo,
        number: job.target.number,
        kind: job.target.kind,
      },
      progress: [...job.progress],
    };

    if (job.report !== undefined) {
      view.report = job.report;
    }
    if (job.error !== undefined) {
      view.error = job.error;
    }
    if (queuePosition !== undefined) {
      view.queuePosition = queuePosition;
    }

    return view;
  }
}
