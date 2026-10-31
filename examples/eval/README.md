# Evaluation on 27 labelled closed issues: re-verified after the verifier fix

This folder is the unedited output of:

```bash
npm run eval -- eval/dataset.json --out examples/eval --reverify-from examples/eval-run1
```

It reuses the claims that `gemma4:e2b-it-qat` extracted in the first full run (`examples/eval-run1/`), so no model was called again. It then redoes checkout, static verification and grading with the fixed verifier. Keeping the claims identical isolates the effect of the fix. The run was on 2026-11-01 at 03:00 IST, without the Docker sandbox.

## Results (from [SUMMARY.md](SUMMARY.md))

| | Committed label | Best guess |
|---|---|---|
| Answered | 1 of 27 (26 abstained) | 27 of 27 |
| Correct | 0 of 1 answered | **12 of 27 (44%)**; always answering one label gets 33% |
| Recall: invalid / cannot-reproduce / confirmed | — | 33% / 67% / 33% |
| **Real bugs dismissed as invalid** | **0** | **1** |

## What changed from the first run, and why

In the first run, 6 issues that maintainers closed as cannot-reproduce were labelled "invalid". Reviewing them showed the static verifier treated these as repository files that should exist:
- paths on the reporter's machine (`/home/<user>/miniconda3/envs/.../bin/ols`, `C:\...\Scripts\decompyle3-script.py`, `~/.vim/plugged/...`),
- files the reporter created (`atw.pyc`, `mini.vim`),
- paths inside dependencies or other projects (`gems/3.4.0/gems/thin-1.8.2/...`, `Smoothieware/...`).

It also treated names from the reporter's own example code as repository symbols. The fix applies general rules, not per-case exceptions:
- A missing file only contradicts a claim when it is a relative path inside one of the repository's own top-level folders.
- Absolute paths, and paths inside dependency or environment folders, are ignored.
- A missing bare file name is noted as "may be the reporter's own file", without a verdict.
- A missing symbol only contradicts a claim that ties it to the repository's code: a code-location claim, or a claim that names a repository file that exists.
- A stack-trace frame at an absolute path outside the repository is skipped, not treated as fabricated.

Two of the first run's "correct" invalid answers (printrun-1393, sinatra-2143) also disappeared. They had matched the maintainers only because of a dependency path and a path into another repository.

**Honesty note:** these bugs were found by looking at errors on this dataset, so this is a post-fix result on the same data, not a held-out score. The first run's unedited results stay in [`../eval-run1/`](../eval-run1/).

## Known remaining errors

- **tailscale-gnome-qs-67** is still labelled "invalid". The claim names `PopupSubMenu`, a GNOME Shell class that is not defined in the repository, together with a repository file, so the verifier ties the class to the repository.
- **plugins-2** (a confirmed bug) gets best guess "invalid". The small model extracted no code references from a detailed report, so the "no technical detail" rule fired.
- **The committed label** almost never answers without execution evidence. That is intended: abstaining is cheaper for a maintainer than a wrong dismissal.
- **The best guess** cannot tell "real bug" from "cannot reproduce" well using static evidence alone.
