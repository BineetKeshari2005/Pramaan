# Pramaan: live demo script (5 minutes) and judge Q&A

Every case below was run on the demo laptop (Apple M3, 8 GB RAM, `gemma4:e2b-it-qat`) on 2026-11-01. The times are from those runs.

---

## Before the demo (T-15 minutes)

1. **Free RAM.** Close Chrome tabs and any other heavy apps. Gemma 4 plus the sandbox VM need about 6.5 GB.
2. **Start Ollama** (the llama icon should be in the menu bar) and check it:
   ```bash
   curl -s localhost:11434/api/version
   ```
3. **Start the sandbox VM**, needed only for the PR test proof:
   ```bash
   colima start --cpu 2 --memory 2
   ```
4. **Start the app:**
   ```bash
   cd ~/code/Pramaan && npm run dev
   ```
5. **Pre-run both demo cases** so their results pages are ready and the model is warm. Open http://localhost:3000 and submit, one after the other:
   - `https://github.com/more-itertools/more-itertools/pull/1342` (about 80 s)
   - `https://github.com/sqlmapproject/sqlmap/issues/6154` (about 30–60 s)

   Keep both result tabs open. Jobs are saved, so a page reload is safe.
6. **Open these tabs, in order:**
   - (1) http://localhost:3000, the form,
   - (2) the sqlmap result,
   - (3) the more-itertools result,
   - (4) `examples/eval/SUMMARY.md` on GitHub,
   - (5) the GitHub issue [sqlmap#6154](https://github.com/sqlmapproject/sqlmap/issues/6154).
7. **Fallback if the network or the model fails:** saved real outputs need nothing.
   ```bash
   npm run pramaan -- render examples/pr-test-honesty/more-itertools-1342.json --format markdown
   ```
   The design is also visible at http://localhost:3000/jobs/sample.

---

## The story (30 seconds)

> "Maintainers are flooded with confident reports that turn out to be wrong: functions that don't exist, stack traces from another version, 'regression tests' that don't test anything. curl even had to change its bug-bounty rules because of fabricated AI reports. Pramaan doesn't guess who wrote a report. It checks whether the claims are **true**. A small open model running on this laptop only *reads* the report and lists the claims. Everything else — every verdict, every confidence level — comes from code: the repository at the right commit, a locked-down sandbox, and fixed grading rules. When it can't verify something, it says so."

---

## Demo (4 minutes)

### 1. Claims checked against the real code (about 75 s): tab (2), sqlmap#6154

**Optional live start.** In tab (1), paste `https://github.com/sqlmapproject/sqlmap/issues/6154` and press **Analyse**. The progress list shows fetching, extracting, checking out the commit from when the issue was filed, and verifying. While it runs, switch to the pre-run result in tab (2).

**Show:**
- **The header:** the commit `11afdcb`. *"This is the code as it was the day the issue was filed, not today's."*
- **The AttributeError claim card:** "From the report" holds the exact quote. *"Every claim must quote the report word for word, or we drop it. The model can't invent claims."*
- **The evidence list:** `lib/controller/action.py` exists, and `singleString` is defined in `lib/core/dump.py`. Click **"View code at this commit →"**: it opens GitHub at the exact line, pinned to the commit.
- **The stack-trace evidence:** "All 4 stack frames inside the repository match the code." *"The traceback is consistent with this code path, so this isn't a made-up crash."*
- **"What is missing":** "The crash itself was not reproduced." *"We say what we couldn't prove."*
- **The banner:** "Needs more information" plus the best guess. *"Static evidence isn't proof, so the committed label abstains, and the best guess is clearly marked as a guess."*

### 2. Executed proof on a pull request (about 75 s): tab (3), more-itertools#1342

**Show:**
- **The banner:** **"Suggested label: Confirmed"**. *"This one is backed by running code."*
- **A PR claim card**, "The fix adds guards…" (Reproduced, high). Its evidence is **Failing test**: "The PR's tests fail without its code changes and pass with them." Open **Show output**:
  - with the PR: `622 passed`,
  - with the fix reverted and the tests kept: `1 failed`, and the new test expected "n must be at least 0".
- *"We ran the PR's own tests twice, inside a container with no network, a read-only disk, no root and hard limits. Tests that pass either way would be flagged as not testing the fix."*
- **The "pytest passed with 767 tests" and "ruff passed" claims:** they stay "Insufficient evidence". *"We didn't check those, so we don't claim them."*

### 3. Share with GitHub (about 45 s): same tab, scroll down

- **The Evidence report (Markdown) tab:** click **Copy Markdown**. *"Ready to paste as a GitHub comment, with permalinks."*
- **The Reply to reporter tab:** a polite draft that asks only for what is missing, and never asks for something the reporter already gave.
- *"Nothing is posted automatically. Pramaan never closes or labels an issue; the maintainer decides."*

### 4. Results (30 s): tab (4), `examples/eval/SUMMARY.md`

From [`examples/eval/SUMMARY.md`](../examples/eval/SUMMARY.md), on 27 real closed issues (9 invalid, 9 cannot-reproduce, 9 confirmed):

| | Committed label | Best guess |
|---|---|---|
| Answered | 1 of 27 | 27 of 27 |
| Correct | 0 of 1 | 12 of 27 (44%), against 33% for always answering one label |
| **Real bugs dismissed as invalid** | **0** | **1** |

> "Two things matter here. First: **zero real bugs dismissed**. We'd rather ask a human than throw away a real security report. Second: static evidence alone rarely settles a report. That's honest, not flattering. Where we *can* execute, like the PR you just saw, we get a confident answer. We also published our first run, which exposed bugs in our own verifier, and the fix, side by side."

---

## Likely judge questions

**How do you run untrusted code safely?**
Repositories are only read: git runs with hooks disabled and symlinks off, without a shell, and commit names are validated. Code from reports and PRs runs only in a throwaway Docker container (see `src/core/sandbox/docker.ts`):
- `--network none`,
- a read-only root filesystem and a read-only repository mount,
- an unprivileged user (uid 65534), `--cap-drop ALL`, `no-new-privileges`,
- memory (no swap), CPU, pids and file limits,
- a timeout that force-removes the container,
- no host environment, so no tokens.

**How do you stop the model from hallucinating claims?**
- Output is constrained by a JSON schema and validated with Zod. Broken output is retried with the error, and after three failures the extractor abstains.
- Every claim must quote the report verbatim, or it's dropped.
- File and function names the report never mentions are stripped.
- With a 1B model we saw it invent a quote ("returns undefined"); the extractor caught it and abstained.

**Why isn't confidence just the model's score?**
Models are confidently wrong. Confidence comes from the *type* of evidence: an executed reproduction or failing test is high, static proof is medium, text only is low. It's a fixed table in `src/core/grading.ts`.

**Why so much abstention? Isn't that a cop-out?**
The worst mistake a triage tool can make is dismissing a real bug, especially a security one. Unreproduced security claims always go to a human, and checks that disagree never get resolved by guessing. We still report a clearly labelled best guess (44% vs. a 33% baseline) for maintainers who want one, and we measured both.

**How did you evaluate?**
On 27 real closed issues whose maintainer labels (invalid / can't reproduce / confirmed) we re-verified on GitHub. The harness (`npm run eval`) produces the confusion matrix, per-label precision and recall, abstention, and "real bugs dismissed". The first run exposed verifier bugs: the reporter's local paths and own files were treated as repository files. We fixed those with general rules, re-ran on the same extracted claims, and published both runs.

**Why Gemma 4 E2B and not something bigger?**
It runs on an 8 GB laptop next to the sandbox; E4B (about 9.5 GB) doesn't fit. Extraction is a reading task. Thinking mode roughly triples the claims found, at about 6× the latency. Any Ollama model can be swapped in with `PRAMAAN_EXTRACT_MODEL`.

**What evidence would maintainers trust?**
Links to the exact line at the exact commit, the real output of executed runs, and an explicit list of what wasn't verified. Every evidence item has one of these.

**Could this be a GitHub App?**
The core is independent of the UI. There's a background job API (`/api/analyze`, `/api/status/:id`) and Markdown output made for GitHub comments. We did **not** build webhook handling or automatic commenting; we deliberately kept posting in human hands.

**What doesn't work yet? (Be direct.)**
- Execution covers Python only.
- Symbol checks are pattern-based.
- A small model can miss claims (for example, one detailed report produced no code references).
- The best guess can't reliably separate "real bug" from "cannot reproduce" without execution.
- The evaluation is small, and its main numbers are post-fix.

---

## If something breaks live

1. **The analysis is slow or stuck:** switch to the pre-run tab. Jobs are saved, and reloading `/jobs/<id>` works.
2. **Ollama or the network is down:** run the `render` command above on the saved reports in `examples/`, or open `/jobs/sample`.
3. **The machine is out of memory:** run `colima stop` (only the PR test proof needs it), and show the saved more-itertools report instead of re-running it.
