import type { Verifier } from "../ports";
import { ReferencesVerifier } from "./references";
import { RepoIndex } from "./repo-index";
import { StackTraceVerifier } from "./stack-trace";

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
      // Keep the few most recent checkouts; a long-running server sees many commits.
      if (indexes.size > 4) indexes.delete(indexes.keys().next().value as string);
    }
    return index;
  };
  return [new ReferencesVerifier(indexFor), new StackTraceVerifier(indexFor)];
}
