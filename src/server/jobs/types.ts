import { z } from "zod";
import type { ProgressEvent } from "../../core/pipeline";
import { type Report, ReportSchema } from "../../core/types";

export class JobInputError extends Error {
  override name = "JobInputError";
  constructor(message: string) {
    super(message);
  }
}

export const COMMIT_REGEX = /^[A-Za-z0-9._\/-]{1,100}$/;

function trimOptional(maxLength: number) {
  return z.preprocess((val) => {
    if (typeof val === "string") {
      const trimmed = val.trim();
      return trimmed === "" ? undefined : trimmed;
    }
    return val;
  }, z.string().max(maxLength, `Must not exceed ${maxLength} characters`).optional());
}

export const AnalyzeRequestSchema = z.object({
  targetUrl: z.preprocess((val) => {
    if (typeof val === "string") {
      return val.trim();
    }
    return val;
  }, z.string({ error: "Target URL is required" }).min(1, "Target URL is required").max(500, "Target URL must not exceed 500 characters")),
  repoUrl: trimOptional(500),
  commit: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        const trimmed = val.trim();
        return trimmed === "" ? undefined : trimmed;
      }
      return val;
    },
    z
      .string()
      .max(100, "Commit must not exceed 100 characters")
      .refine((val) => !val.startsWith("-"), 'Commit must not start with "-"')
      .regex(COMMIT_REGEX, "Invalid commit format")
      .optional(),
  ),
  buildCommand: trimOptional(500),
  testCommand: trimOptional(500),
  notes: trimOptional(2000),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const JOB_STATUSES = ["queued", "running", "done", "failed"] as const;
export const JobStatusSchema = z.enum(JOB_STATUSES);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export interface JobTarget {
  owner: string;
  repo: string;
  number: number;
  kind: "issue" | "pull";
}

export interface JobView {
  id: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  input: AnalyzeRequest;
  target: JobTarget;
  progress: ProgressEvent[];
  report?: Report;
  error?: string;
  queuePosition?: number;
}
