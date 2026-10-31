# Pramaan evidence report: memroot/plugins#[1](https://github.com/memroot/plugins/issues/1)

**Verified commit:** [a7cf82b](https://github.com/memroot/plugins/commit/a7cf82b1c3cb2a723e2d76009d4b552bb81b4954)

**Suggested label:** **Needs more information**
The evidence is not strong enough for a verdict; the report needs more detail.

**Best guess if a label must be chosen:** Could not reproduce: The claims could not be checked and the report gives no trace or steps to reproduce. _(a guess from fixed evidence rules, not a verdict)_

_Suggested label only — Pramaan never closes issues._

| # | Claim | Verdict | Confidence | Human review |
|---|---|---|---|---|
| 1 | The recall gate in `recall-check.mjs` (PreToolUse, mode `deny-once`) denies the first file-changing call of every subagent until that subagent calls `memory_retrieve`. | Insufficient evidence | Low | Yes |
| 2 | Subagents whose agent definition has a fixed tool list (custom `.claude/agents/*.md` types such as a code reviewer, a test runner or a visual critic) do not get the Memroot MCP tools, so they cannot satisfy the gate. | Insufficient evidence | None | Yes |
| 3 | A subagent with a fixed tool list runs a mutating `Bash` command (or `Write`/`Edit`). | Insufficient evidence | None | Yes |
| 4 | The gate returns `permissionDecision: "deny"` with "Memroot check pending for this subagent's task …". | Insufficient evidence | None | Yes |
| 5 | The subagent has no `memory_retrieve` tool. | Insufficient evidence | None | Yes |
| 6 | The retry does go through, as documented, but in practice many agents read the denial as a hard block. | Insufficient evidence | None | Yes |
| 7 | In one long multi-agent session, most review and critic subagents experienced this issue, resulting in one reviewer producing no measurements. | Insufficient evidence | None | Yes |
| 8 | The gate should not deny a subagent that has no way to call `memory_retrieve`. | Insufficient evidence | None | Yes |
| 9 | Using the non-blocking `context` mode instead of `deny-once` for subagents should resolve the issue, as the SubagentStart context already tells them about Memroot. | Insufficient evidence | None | Yes |
| 10 | Denying should only occur when the subagent's tool list actually includes a Memroot tool, if the host exposes it. | Insufficient evidence | None | Yes |
| 11 | Adding a setting to choose the subagent gate mode separately from the main-session mode is an option. | Insufficient evidence | None | Yes |
| 12 | The issue occurred with memroot plugin version 0.12.1 (Claude Code) on Linux. | Insufficient evidence | None | No |

### Claim 1: The recall gate in `recall-check.mjs` (PreToolUse, mode `deny-once`) denies the first file-changing call of every subagent until that subagent calls `memory_retrieve`.

> The recall gate in `recall-check.mjs` (PreToolUse, mode `deny-once`) denies the first file-changing call of every subagent until that subagent calls `memory_retrieve`.

**Evidence:**

- **Static code check:** File `plugins/codex/scripts/recall-check.mjs` exists in memroot/plugins at a7cf82b. [code](https://github.com/memroot/plugins/blob/a7cf82b1c3cb2a723e2d76009d4b552bb81b4954/plugins/codex/scripts/recall-check.mjs)

- **Text only:** `mjs` appears in `.github/workflows/sync.yml` line 41, but no definition was found (it may come from a dependency or be generated). [code](https://github.com/memroot/plugins/blob/a7cf82b1c3cb2a723e2d76009d4b552bb81b4954/.github/workflows/sync.yml#L41)
  <details><summary>Output</summary>

  ```
  node tooling/export-marketplace.mjs --version "$RELEASE_VERSION" --integrity "$RELEASE_INTEGRITY" --current release.json --output "$RUNNER_TEMP/marketplace-next"
  ```
  </details>

- **Static code check:** Line 1 of `plugins/codex/scripts/recall-check.mjs` exists; the code there is shown below. [code](https://github.com/memroot/plugins/blob/a7cf82b1c3cb2a723e2d76009d4b552bb81b4954/plugins/codex/scripts/recall-check.mjs#L1)
  <details><summary>Output</summary>

  ```
  1 | #!/usr/bin/env node
  2 | 
  3 | // src/project-selection.ts
  4 | import { randomBytes as randomBytes2, randomUUID } from "node:crypto";
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

### Claim 2: Subagents whose agent definition has a fixed tool list (custom `.claude/agents/*.md` types such as a code reviewer, a test runner or a visual critic) do not get the Memroot MCP tools, so they cannot satisfy the gate.

> Subagents whose agent definition has a fixed tool list (custom `.claude/agents/*.md` types such as a code reviewer, a test runner or a visual critic) do not get the Memroot MCP tools, so they cannot satisfy the gate.

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 3: A subagent with a fixed tool list runs a mutating `Bash` command (or `Write`/`Edit`).

> A subagent with a fixed tool list runs a mutating `Bash` command (or `Write`/`Edit`).

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 4: The gate returns `permissionDecision: "deny"` with "Memroot check pending for this subagent's task …".

> The gate returns `permissionDecision: "deny"` with "Memroot check pending for this subagent's task …".

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 5: The subagent has no `memory_retrieve` tool.

> The subagent has no `memory_retrieve` tool.

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 6: The retry does go through, as documented, but in practice many agents read the denial as a hard block.

> The retry does go through, as documented, but in practice many agents read the denial as a hard block.

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 7: In one long multi-agent session, most review and critic subagents experienced this issue, resulting in one reviewer producing no measurements.

> In one long multi-agent session this happened to most of the review and critic subagents. One reviewer produced no measurements at all because of it.

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 8: The gate should not deny a subagent that has no way to call `memory_retrieve`.

> The gate should not deny a subagent that has no way to call `memory_retrieve`.

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 9: Using the non-blocking `context` mode instead of `deny-once` for subagents should resolve the issue, as the SubagentStart context already tells them about Memroot.

> For subagents (`agent_id` present), use the non-blocking `context` mode instead of `deny-once`. The SubagentStart context already tells them about Memroot.

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 10: Denying should only occur when the subagent's tool list actually includes a Memroot tool, if the host exposes it.

> Deny only when the subagent's tool list actually includes a Memroot tool, if the host exposes it.

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 11: Adding a setting to choose the subagent gate mode separately from the main-session mode is an option.

> Add a setting to choose the subagent gate mode separately from the main-session mode.

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 12: The issue occurred with memroot plugin version 0.12.1 (Claude Code) on Linux.

> memroot plugin 0.12.1 (Claude Code), Linux

**Evidence:**

- No evidence recorded

**What is missing:**

- Recorded as context: environment and version details are not verified against the code.

---
Generated by Pramaan at 2026-10-31T21:25:48.682Z using gemma4:e2b-it-qat. Verdicts come from code checks, not from the model.
