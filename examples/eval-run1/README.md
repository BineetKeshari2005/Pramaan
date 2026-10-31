# First full evaluation run (27 issues), before the verifier fix

This is the unedited output of:

```bash
npm run eval -- eval/dataset.json --out examples/eval
```

It ran on 2026-11-01 between 02:34 and 02:56 IST, with `gemma4:e2b-it-qat` and without the Docker sandbox. The dataset is `eval/dataset.json`: 27 real closed issues, 9 per label, every label re-verified on GitHub.

Headline (from [SUMMARY.md](SUMMARY.md)):
- **Committed label:** answered 8 of 27, abstained on 19. All 8 answers were "invalid"; 2 matched the maintainers, and 6 were issues the maintainers closed as "cannot-reproduce". **Real bugs dismissed as invalid: 0.**
- **Best guess:** 11 of 27 correct (41%), against 33% for always answering one label. Real bugs dismissed as invalid: 1.

Reviewing the six wrong "invalid" answers showed they come from verifier bugs, not real evidence. The verifier treated these as repository files that should exist:
- paths on the reporter's own machine (`/home/<user>/miniconda3/.../bin/ols`, `C:\...\Scripts\decompyle3-script.py`, `~/.vim/plugged/...`),
- files the reporter created (`atw.pyc`, `mini.vim`),
- paths inside dependencies (`gems/3.4.0/gems/thin-1.8.2/...`).

It also treated symbols from the reporter's own example code as repository symbols. The fix and a re-run on the same saved claims are in `examples/eval/`. Because these bugs were found by looking at errors on this dataset, the re-run is reported as a post-fix result, not a held-out score.
