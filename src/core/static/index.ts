import type { Verifier } from "../ports";
import { PrDiffVerifier } from "./pr-diff";
import { ReferencesVerifier } from "./references";
import { RepoIndex } from "./repo-index";
import { StackTraceVerifier } from "./stack-trace";

export * from "./pr-diff";
export * from "./references";
export * from "./repo-index";
export * from "./stack-trace";

/** Static (non-executing) verifiers sharing one file index per checked-out commit. */
export function createStaticVerifiers(): Verifier[] {
  const indexes = new Map<string, RepoIndex>();
  const indexFor = (dir: string) => {
    let index = indexes.get(dir);
    if (!index) {
      index = new RepoIndex(dir);
      indexes.set(dir, index);
      // Keep the two most recent checkouts: a PR needs its head and base at once.
      if (indexes.size > 2) indexes.delete(indexes.keys().next().value as string);
    }
    return index;
  };
  return [new ReferencesVerifier(indexFor), new StackTraceVerifier(indexFor), new PrDiffVerifier(indexFor)];
}
