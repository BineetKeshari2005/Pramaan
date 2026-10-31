import { type ProgressEvent, runPipeline } from "../../core/pipeline";
import type { TargetRef } from "../../core/ports";
import { JobService } from "./service";
import type { AnalyzeRequest } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var __pramaanJobService__: JobService | undefined;
}

export function createDefaultJobService(): JobService {
  return new JobService({
    analyze: async (
      input: AnalyzeRequest,
      ref: TargetRef,
      onProgress: (e: ProgressEvent) => void,
    ) => {
      const { createDeps } = await import("../../cli/deps");
      const deps = createDeps();
      return runPipeline(ref, deps, {
        commit: input.commit,
        onProgress,
      });
    },
  });
}

export function getJobService(): JobService {
  if (!globalThis.__pramaanJobService__) {
    globalThis.__pramaanJobService__ = createDefaultJobService();
  }
  return globalThis.__pramaanJobService__;
}

export function setJobServiceForTests(service: JobService | null): void {
  globalThis.__pramaanJobService__ = service ?? undefined;
}
