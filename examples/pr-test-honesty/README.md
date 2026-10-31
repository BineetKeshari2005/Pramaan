# PR test-honesty check: a real example

- **Input:** [more-itertools/more-itertools#1342](https://github.com/more-itertools/more-itertools/pull/1342), "fix: validate the chunk size in chunked_even". It changes `more_itertools/more.py` and `tests/test_more.py`.
- **Output:** [`more-itertools-1342.json`](more-itertools-1342.json) (the full report) and [`more-itertools-1342.md`](more-itertools-1342.md) (the Markdown evidence report). Both are the unedited output of:

```bash
npm run pramaan -- check https://github.com/more-itertools/more-itertools/pull/1342 --out examples/pr-test-honesty/more-itertools-1342.json
```

This ran on 2026-11-01 at about 03:10 IST, with `gemma4:e2b-it-qat`, Colima, and the `pramaan-python-test:1` sandbox image (`npm run sandbox:image`).

What happened:
1. The PR's test file ran in the sandbox on the PR head: **622 passed**.
2. The same test file ran on a copy where `more_itertools/more.py` was put back to the base commit: **1 failed**. The new test expected `n must be at least 0` and got the old `islice` error.
3. The failing test demonstrates both the fix and the faulty behavior it covers, so the **seven claims about the bug, the fix and its new tests are all reproduced** with `failing_test` evidence, and the suggested label is **confirmed**.
4. The claims "pytest passed with 767 tests" and "ruff check passed" stay **insufficient evidence**: the two runs do not check them, so Pramaan does not claim they are true.

Everything ran with no network, a read-only filesystem, an unprivileged user and resource limits.
