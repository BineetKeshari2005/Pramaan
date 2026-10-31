# Pramaan

**Fact-checking for GitHub issues and pull requests.** Pramaan splits a report into individual technical claims, checks each claim against the repository's real code at the right commit, runs the reporter's code or the PR's tests in a locked-down sandbox when it can, and shows maintainers the evidence. When it cannot verify a claim, it says so instead of guessing.

**The model reads; code decides.** A small open-weight model (`gemma4:e2b-it-qat`, running locally through Ollama) only extracts claims from text. Every verdict and every confidence level comes from code: file and symbol checks, stack-trace matching, executed reproductions and test runs.

*Pramaan* (प्रमाण) means "evidence" or "proof" in Sanskrit and Hindi. Built in 12 hours by team Black Coffee for Hacktoberfest Hack Day Sonipat. See [HACKATHON.md](HACKATHON.md).

---

## Why

Maintainers receive a steady stream of bug reports, security reports and pull requests that sound confident but are wrong. Some name functions that do not exist, quote stack traces from another version, describe behavior that cannot be reproduced, or add "regression tests" that pass with or without the fix.

Pramaan does **not** try to detect whether a human or an AI wrote a report. It checks whether the **claims are true**, and shows its work so a maintainer can trust or overrule it in seconds.

## How it works

```
 GitHub issue / PR
        │
        ▼
 1. Fetch            title, body, the author's own comments, PR diff file list
        │
        ▼
 2. Extract claims   local model → schema-validated JSON; every claim must quote the report verbatim
        │
        ▼
 3. Check out code   the commit the report refers to (default branch when the issue was filed, or the PR head)
        │
        ├─▶ 4a. Static checks    do the named files, functions, lines exist? does the stack trace match the code?
        ├─▶ 4b. Sandbox          run the reporter's Python snippet; run the PR's tests with and without its fix
        │
        ▼
 5. Grade            confidence from evidence type → per-claim verdict → suggested label (+ best guess)
        │
        ▼
 6. Report           web page, JSON, Markdown for GitHub, and a draft reply asking the reporter for what is missing
```

**Evidence ladder.** Confidence comes only from the *type* of evidence, never from asking the model:

| Evidence | Confidence |
|---|---|
| Executed reproduction, or a test that fails without a fix and passes with it | high |
| Static proof (code that exists or does not exist, a stack trace that matches or does not) | medium |
| Text only (e.g. a name that appears but is never defined) | low |
| Nothing checkable | none |

**Grounding.** The extractor drops any claim whose quote is not literally in the report. It also strips file and function names the report never mentions. Broken JSON is retried with the error message, and after three failures the extractor abstains instead of guessing.

## Verdicts and labels

Each claim gets one verdict:

- **Reproduced:** the claim held up when its code was executed (or, for a "this code exists" claim, the code is there).
- **Contradicted:** the report names code that does not exist at the checked commit, a stack trace that does not match the code, or a PR whose tests pass even without its fix.
- **Not reproduced:** the reporter's code ran cleanly.
- **Insufficient evidence:** nothing checkable settled it. The report lists exactly what is missing.

Each report gets two labels:

- **Committed label:** `confirmed`, `invalid` or `cannot-reproduce`, given only when code settles it. Otherwise `needs-info` or `needs-human-review`.
- **Best guess** (issues only; on pull requests the test check below is the decisive signal): the closest closed-issue label when forced to choose, shown to maintainers as a guess. It comes from fixed rules in [`src/core/grading.ts`](src/core/grading.ts), checked in order:
  1. executed result → confirmed / cannot-reproduce,
  2. contradicted code → invalid,
  3. no code references and no technical evidence → invalid,
  4. a stack trace that does not match the code → cannot-reproduce,
  5. a trace or repro steps, and the named code exists → confirmed,
  6. otherwise → cannot-reproduce.

**Safety rules:**
- A security claim that was not reproduced always goes to a human. It is never labelled invalid.
- Checks that disagree are never resolved by picking a side.
- **Pramaan never closes, labels or comments on issues itself.** It only suggests.

## Safety: running untrusted code

Reports and pull requests come from strangers, so nothing from them ever runs on the host.

- **Repositories are only read.** They are checked out with `git` using `-c core.hooksPath=/dev/null` (no hooks), `-c core.symlinks=false`, and `-c protocol.file.allow=never`. Commit names are validated before git runs, and git is called without a shell. The file index never follows symlinks.
- **Execution happens only in a throwaway Docker container** ([`src/core/sandbox/docker.ts`](src/core/sandbox/docker.ts)):
  - `--network none`: no network at all,
  - `--read-only` root filesystem, with small `tmpfs` scratch space,
  - the checkout mounted **read-only**,
  - `--user 65534:65534` (nobody), `--cap-drop ALL`, `--security-opt no-new-privileges`,
  - `--memory` with equal `--memory-swap`, `--cpus`, `--pids-limit 128`, plus open-file and file-size ulimits,
  - a wall-clock timeout, after which the container is force-removed,
  - no host environment passed in: no tokens, no secrets.
- **Environment gaps are never verdicts.** A snippet that fails because the network is blocked, or because a third-party package is missing, is reported as such, never as "reproduced".

## Quick start

**Prerequisites:**
- Node.js 22+ and git.
- [Ollama](https://ollama.com) 0.40 or newer. Gemma 4 needs a recent Ollama.
- The GitHub CLI, logged in (`gh auth login`), to provide a token.
- Optional: Docker or Colima, for the sandbox.

Install dependencies:

```bash
npm ci
```

Download the model (4.3 GB; fits an 8 GB laptop):

```bash
ollama pull gemma4:e2b-it-qat
```

Give Pramaan a GitHub token without ever pasting it anywhere. `.env.local` is gitignored, and a test fails if it ever stops being ignored.

```bash
echo "GITHUB_TOKEN=$(gh auth token)" > .env.local
```

Optional: start the sandbox runtime and build the pytest image (needed for PR test checks):

```bash
colima start --cpu 2 --memory 2
```

```bash
npm run sandbox:image
```

### Web app

```bash
npm run dev
```

Open http://localhost:3000, paste an issue or pull request link, and watch the analysis run live. It takes about 30–60 s on a laptop. The results page shows:
- a card for each claim with its verdict, confidence, the quote it came from, and evidence linked to the exact line at the verified commit,
- what is missing,
- a **Copy as GitHub comment** button: ready-to-paste Markdown with a one-line summary, one block per claim (verdict, evidence level, evidence, what is missing), detailed logs folded into `<details>`, and a suggested label. Report text is untrusted, so @mentions, `#123` references and links in it are neutralized and logs are fenced safely; evidence is trimmed, never verdicts, to stay under GitHub's 65,536-character limit. Pramaan only copies it; it never posts,
- a **Share on GitHub** panel with the same comment and a draft reply to the reporter.

To see the design without running an analysis, open http://localhost:3000/jobs/sample.

**Triage queue** (http://localhost:3000/queue): paste 2 to 10 issue and pull request links, one per line, from any repositories. Invalid lines are skipped one by one. The links run one at a time through the same pipeline, a failure does not stop the rest, and the results are ranked by evidence strength: reproduced first, then contradicted, not reproduced, insufficient evidence and failed. Ties go to the stronger evidence, then more strongly evidenced claims, then paste order. Pick any row, or step through results with Previous and Next, to read its full report and copy its comment. The order is a reading order; nothing is closed or labelled on GitHub.

### Command line

Analyse an issue or PR and print the JSON report:

```bash
npm run pramaan -- check https://github.com/sqlmapproject/sqlmap/issues/6154
```

Print the Markdown evidence report or the reporter reply instead:

```bash
npm run pramaan -- check https://github.com/more-itertools/more-itertools/pull/1342 --format markdown
```

Re-render a saved report without running anything:

```bash
npm run pramaan -- render examples/pr-test-honesty/more-itertools-1342.json --format reply
```

## Evaluation

The hackathon evaluates tools on closed public issues labelled *invalid*, *cannot reproduce* or *confirmed*. We built that test ourselves:

- **Dataset:** [`eval/dataset.json`](eval/dataset.json). 27 real closed issues from 17 repositories, 9 per label, every label re-verified on GitHub. See [eval/README.md](eval/README.md).
- **Harness:** `npm run eval -- eval/dataset.json`. It runs the real pipeline on each issue, saves every report, and computes a confusion matrix, per-label precision and recall, the abstention rate and the harmful mistakes.

```bash
npm run eval -- eval/dataset.json --out examples/eval
```

**Results** (from [`examples/eval/SUMMARY.md`](examples/eval/SUMMARY.md)):

| | Committed label | Best guess |
|---|---|---|
| Answered | 1 of 27 (abstained on 96%) | 27 of 27 |
| Correct | 0 of 1 | **12 of 27 (44%)**; always answering one label gets 33% |
| Recall: invalid / cannot-reproduce / confirmed | — | 33% / 67% / 33% |
| **Real bugs dismissed as invalid** | **0** | **1** |

**What the numbers mean.**
- Static evidence alone rarely settles a report. On most real issues the referenced files, functions and stack-trace frames exist whatever the final label, so the committed label abstains rather than risk dismissing a real bug. It dismissed none.
- The best guess beats the baseline but cannot reliably separate "real bug" from "cannot reproduce" without running the code. Execution is where certainty comes from. When it is possible, Pramaan uses it: on [more-itertools#1342](examples/pr-test-honesty/README.md) it ran the PR's tests with and without the fix (622 passed vs. 1 failed) and labelled the PR **confirmed**.
- Two honesty notes:
  - The first full run is kept unedited in [`examples/eval-run1/`](examples/eval-run1/). Reviewing its errors exposed verifier bugs (reporters' local paths treated as repository files), which we fixed with general rules. The main results are those fixed checks re-run on the same extracted claims, so they are a post-fix result, not a held-out score.
  - [`examples/eval-seed/`](examples/eval-seed/) is the small development set used while building the harness.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `GITHUB_TOKEN` | none (60 requests/hour) | GitHub API token, read from `.env.local` |
| `PRAMAAN_EXTRACT_MODEL` | `gemma4:e2b-it-qat` | Any Ollama model tag, e.g. `gemma4:e4b` on a 16 GB machine |
| `PRAMAAN_EXTRACT_THINK` | `true` | Gemma's thinking mode. About 3× more claims found on our tests, at about 6× the latency. |
| `OLLAMA_URL` | `http://localhost:11434` | Where Ollama runs |
| `PRAMAAN_SANDBOX` | on | `off` disables the Docker sandbox (snippet and PR test runs) |

## Limitations

- **Static symbol checks are pattern-based**, not full parsers, across Python, JavaScript/TypeScript, Go, Rust, Java and Ruby. A library name tied to a repository file can still be counted as a missing repository symbol.
- **Execution covers Python only:** reporters' snippets that need just the repository and the standard library, and PR test files runnable with pytest. JavaScript/TypeScript projects usually need dependencies installed and a build step, which an offline sandbox cannot do.
- **A 4.6B-parameter model can miss claims or code references**, especially in long or non-English reports. Grounding prevents invented claims, not missed ones.
- **The best guess is a guess.** It is weak at telling "real bug" from "cannot reproduce" without execution.
- **The evaluation is small** (27 issues), and its main results are post-fix (see above).

## Project layout

```
src/core/          all analysis logic, independent of the web app
  claims/          extraction prompt, grounding, evidence detection
  llm/             Ollama client
  github/          issue/PR fetcher and safe git checkout
  static/          file, symbol, line and stack-trace verifiers
  sandbox/         Docker sandbox, snippet reproduction, PR test-honesty check
  report/          Markdown evidence report and reporter reply
  grading.ts       evidence → confidence → verdict → labels
  pipeline.ts      fetch → extract → checkout → verify → grade
src/cli/           `npm run pramaan` command line
src/server/jobs/   background job queue for the web app
src/app/           Next.js web UI and API routes
src/eval/          evaluation harness
eval/              labelled dataset of closed issues
examples/          real inputs and real outputs
tests/             Vitest suites, fixtures and recorded real model outputs
sandbox/           Dockerfile for the pytest sandbox image
```

## Testing and CI

```bash
npm test
```

GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs on every pull request:
1. `npm ci`
2. typecheck
3. the full test suite
4. a production build of the web app
5. a CLI smoke test

CI needs no network, model or Docker. Tests use fakes, recorded real GitHub responses and recorded real Gemma 4 outputs. The real-container sandbox tests run locally:

```bash
PRAMAAN_DOCKER_TESTS=1 npx vitest run tests/sandbox
```

## Team

Team **Black Coffee**: Bineet Keshari, Piyush Sharma, Shourya Pratap.

## License

[MIT](LICENSE)
