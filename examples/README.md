# Examples: real inputs and real outputs

Everything in this folder was produced by running Pramaan itself. No report here is written or edited by hand.

## `eval-seed/`: 9 labelled closed issues

- **Input:** [`eval-seed/dataset.json`](eval-seed/dataset.json). Nine real, closed GitHub issues, three for each label maintainers used when closing them (`invalid`, `cannot-reproduce`, `confirmed`). Every label was checked against the GitHub API. Pramaan never sees these labels.
- **Output:**
  - [`eval-seed/SUMMARY.md`](eval-seed/SUMMARY.md): headline numbers, precision and recall per label, the confusion matrix, and every case.
  - [`eval-seed/reports/`](eval-seed/reports/): one full report per issue, as JSON (the API/CLI output) and as Markdown (the text a maintainer would paste on GitHub).
  - [`eval-seed/results.json`](eval-seed/results.json) and [`eval-seed/metrics.json`](eval-seed/metrics.json): machine-readable results.

To reproduce it: Ollama running with `gemma4:e2b-it-qat`, `GITHUB_TOKEN` in `.env.local`, and optionally Colima or Docker for the sandbox. Then run:

```bash
npm run eval -- examples/eval-seed/dataset.json --out examples/eval-seed --fresh
```

Results can differ slightly between runs and machines: the model runs at temperature 0, but issues can be edited and Ollama versions differ. The saved reports are the exact output of the run that produced them.

## Two labels: committed and best guess

- The **committed label** is given only when code settles it: either the report names code that does not exist, or the reporter's snippet was run in the sandbox. Otherwise Pramaan abstains with `needs-info` or `needs-human-review`.
- The **best guess** is the closest closed-issue label when forced to choose. It comes from fixed evidence rules in `src/core/grading.ts` (`bestGuess`), checked in order:
  1. executed result,
  2. contradicted code,
  3. no technical detail,
  4. a stack trace that does not match the code,
  5. a trace or steps plus code that exists,
  6. otherwise cannot-reproduce.

  It is shown to maintainers as a guess, not a verdict.
- `SUMMARY.md` scores both labels and compares the best guess with always answering the most common label. The 9-case seed set is a development set; the rules were written before looking at its results. One bug fix to rule 3 is noted in the git history: a keypress the model filed as a "command" no longer counts as a code reference.

## How to read a report

- Each **claim** is one checkable statement taken from the issue. It always carries a word-for-word quote from the report.
- The **verdict** comes from code, never from the model:
  - **Contradicted:** the report names code that does not exist at the commit, or a stack trace that does not match the code.
  - **Reproduced** or **Not reproduced:** the reporter's snippet was run in the network-less sandbox.
  - **Insufficient evidence:** nothing checkable settled it. The report then lists what is missing.
- The **suggested label** is only a suggestion. Pramaan never closes or labels issues itself.
