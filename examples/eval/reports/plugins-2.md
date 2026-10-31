# Pramaan evidence report: memroot/plugins#[2](https://github.com/memroot/plugins/issues/2)

**Verified commit:** [7f93f26](https://github.com/memroot/plugins/commit/7f93f267e96bb421ae5282c7d73f588931764410)

**Suggested label:** **Needs more information**
The evidence is not strong enough for a verdict; the report needs more detail.

**Best guess if a label must be chosen:** Could not reproduce: The claims could not be checked and the report gives no trace or steps to reproduce. _(a guess from fixed evidence rules, not a verdict)_

_Suggested label only — Pramaan never closes issues._

| # | Claim | Verdict | Confidence | Human review |
|---|---|---|---|---|
| 1 | An agent submitted a PR approval under the user's account despite Memroot holding a preference forbidding it. | Insufficient evidence | None | Yes |
| 2 | The query `&lt;repo-name&gt; e2e test repository code review conventions` returned no rule. | Insufficient evidence | None | Yes |
| 3 | The query `code review conventions` returned no rule. | Insufficient evidence | None | Yes |
| 4 | The query `review pull request leave inline comments approve or request changes` returned a rule with rank 1. | Insufficient evidence | None | Yes |
| 5 | The query `code review preferences of the user` returned a rule with rank 1. | Insufficient evidence | None | Yes |
| 6 | A relevance cutoff causes a rule to be dropped. | Insufficient evidence | None | Yes |
| 7 | The recall gate requires one check per prompt, and an outward action later in the same prompt gets no new check. | Insufficient evidence | None | Yes |
| 8 | `memory_create` accepts near-duplicates without a warning. | Insufficient evidence | None | Yes |
| 9 | The environment uses Memroot plugin 0.12.2 (commit `7f93f26`) and Claude Code 2.1.312. | Insufficient evidence | None | No |

### Claim 1: An agent submitted a PR approval under the user's account despite Memroot holding a preference forbidding it.

> An agent submitted a PR approval under the user's account. Memroot already held two copies of a preference that forbids this ("review verdict is a suggestion only; never submit approve"). Neither copy reached the agent.

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 2: The query `&lt;repo-name&gt; e2e test repository code review conventions` returned no rule.

> | Query | Rule returned |
> |---|---|
> | `&lt;repo-name&gt; e2e test repository code review conventions` | No (3–4 comment-style conventions only) |

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 3: The query `code review conventions` returned no rule.

> `code review conventions` | No

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 4: The query `review pull request leave inline comments approve or request changes` returned a rule with rank 1.

> `review pull request leave inline comments approve or request changes` | Yes, rank 1

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 5: The query `code review preferences of the user` returned a rule with rank 1.

> `code review preferences of the user` | Yes, rank 1

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 6: A relevance cutoff causes a rule to be dropped.

> A larger budget does not help, so a relevance cutoff drops the rule.

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 7: The recall gate requires one check per prompt, and an outward action later in the same prompt gets no new check.

> The recall gate asks for one check per prompt. An outward action later in the same prompt (`gh pr review --approve`, `gh pr merge`) gets no new check.

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 8: `memory_create` accepts near-duplicates without a warning.

> `memory_create` accepts near-duplicates without a warning.

**Evidence:**

- **Text only:** `memory_create` appears in `plugins/claude/scripts/capture-worker.mjs` line 16212, but no definition was found (it may come from a dependency or be generated). [code](https://github.com/memroot/plugins/blob/7f93f267e96bb421ae5282c7d73f588931764410/plugins/claude/scripts/capture-worker.mjs#L16212)
  <details><summary>Output</summary>

  ```
  # Entities and assertions (memory_create contract)
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

### Claim 9: The environment uses Memroot plugin 0.12.2 (commit `7f93f26`) and Claude Code 2.1.312.

> Environment:
> - Memroot plugin 0.12.2 (commit `7f93f26`), user scope
> - Claude Code 2.1.312, macOS

**Evidence:**

- No evidence recorded

**What is missing:**

- Recorded as context: environment and version details are not verified against the code.

---
Generated by Pramaan at 2026-10-31T22:57:01.596Z using gemma4:e2b-it-qat. Verdicts come from code checks, not from the model.
