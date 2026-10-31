# Pramaan evidence report: more-itertools/more-itertools#[1342](https://github.com/more-itertools/more-itertools/pull/1342)

**Verified commit:** [fbd5513](https://github.com/more-itertools/more-itertools/commit/fbd55137fe47b44f55190c3714c75f1b21bf834d)

**Suggested label:** **Confirmed**
3 claim(s) reproduced by execution.

_Suggested label only — Pramaan never closes issues._

| # | Claim | Verdict | Confidence | Human review |
|---|---|---|---|---|
| 1 | The function `chunked_even(iterable, n)` did not validate `n` before passing it to `islice`. | Insufficient evidence | Low | Yes |
| 2 | A negative size causes a `ValueError: Indices for islice()...` error. | Insufficient evidence | Low | Yes |
| 3 | A zero size causes a `ValueError: Step for islice()...` error and consumes two source items before raising. | Insufficient evidence | Low | Yes |
| 4 | The fix adds guards at the top of `chunked_even`, before `iter(iterable)`, to validate sizes. | Reproduced | High | No |
| 5 | Invalid sizes fail before any source consumption and match the rest of the module. | Insufficient evidence | Low | Yes |
| 6 | The new tests `test_zero_chunk_size` and `test_negative_chunk_size` fail on commit `4aeb433` with `islice` errors and pass on this branch. | Reproduced | High | No |
| 7 | The new tests assert that the source iterator is untouched after an error or empty result. | Reproduced | High | No |
| 8 | `pytest -q` passed with 767 tests and 21,194 subtests. | Insufficient evidence | None | Yes |
| 9 | `ruff check more_itertools tests` and `ruff format --check more_itertools tests` passed. | Insufficient evidence | None | Yes |

### Claim 1: The function `chunked_even(iterable, n)` did not validate `n` before passing it to `islice`.

> `chunked_even(iterable, n)` did not validate `n` before handing it to `islice`.

**Evidence:**

- **Static code check:** `chunked_even` is defined in `more_itertools/more.py` line 4617 (and 1 more place). [code](https://github.com/more-itertools/more-itertools/blob/fbd55137fe47b44f55190c3714c75f1b21bf834d/more_itertools/more.py#L4617)
  <details><summary>Output</summary>

  ```
  4615 | 
  4616 | 
  4617 | def chunked_even(iterable, n):
  4618 |     """Break *iterable* into lists of approximately length *n*.
  4619 |     Items are distributed such the lengths of the lists differ by at most
  4620 |     1 item.
  4621 | 
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

### Claim 2: A negative size causes a `ValueError: Indices for islice()...` error.

> A negative size leaked `ValueError: Indices for islice()...`

**Evidence:**

- **Static code check:** `chunked_even` is defined in `more_itertools/more.py` line 4617 (and 1 more place). [code](https://github.com/more-itertools/more-itertools/blob/fbd55137fe47b44f55190c3714c75f1b21bf834d/more_itertools/more.py#L4617)
  <details><summary>Output</summary>

  ```
  4615 | 
  4616 | 
  4617 | def chunked_even(iterable, n):
  4618 |     """Break *iterable* into lists of approximately length *n*.
  4619 |     Items are distributed such the lengths of the lists differ by at most
  4620 |     1 item.
  4621 | 
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

### Claim 3: A zero size causes a `ValueError: Step for islice()...` error and consumes two source items before raising.

> a zero size leaked `ValueError: Step for islice()...` and consumed two source items before raising.

**Evidence:**

- **Static code check:** `chunked_even` is defined in `more_itertools/more.py` line 4617 (and 1 more place). [code](https://github.com/more-itertools/more-itertools/blob/fbd55137fe47b44f55190c3714c75f1b21bf834d/more_itertools/more.py#L4617)
  <details><summary>Output</summary>

  ```
  4615 | 
  4616 | 
  4617 | def chunked_even(iterable, n):
  4618 |     """Break *iterable* into lists of approximately length *n*.
  4619 |     Items are distributed such the lengths of the lists differ by at most
  4620 |     1 item.
  4621 | 
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

### Claim 4: The fix adds guards at the top of `chunked_even`, before `iter(iterable)`, to validate sizes.

> The fix adds those two guards at the top of `chunked_even`, before `iter(iterable)

**Evidence:**

- **Static code check:** `chunked_even` is defined in `more_itertools/more.py` line 4617 (and 1 more place). [code](https://github.com/more-itertools/more-itertools/blob/fbd55137fe47b44f55190c3714c75f1b21bf834d/more_itertools/more.py#L4617)
  <details><summary>Output</summary>

  ```
  4615 | 
  4616 | 
  4617 | def chunked_even(iterable, n):
  4618 |     """Break *iterable* into lists of approximately length *n*.
  4619 |     Items are distributed such the lengths of the lists differ by at most
  4620 |     1 item.
  4621 | 
  ```
  </details>

- **Failing test:** The PR's tests fail without its code changes and pass with them (more-itertools/more-itertools 4aeb433..fbd5513), so they demonstrate the fix.
  <details><summary>Output</summary>

  ```
  # pytest tests/test_more.py
  ## with the PR's changes: exit 0
  ........................................................................ [ 11%]
  ........................................................................ [ 23%]
  ........................................................................ [ 34%]
  ........................................................................ [ 46%]
  ........................................................................ [ 57%]
  ........................................................................ [ 69%]
  ........................................................................ [ 81%]
  ........................................................................ [ 92%]
  ..............................................                           [100%]
  622 passed in 5.49s
  ## with the PR's code changes reverted (tests kept): exit 1
  ........................................................................ [ 11%]
  ........................................................................ [ 23%]
  ........................................................................ [ 34%]
  ........................................................................ [ 46%]
  ........................................................................ [ 57%]
  ........................................................................ [ 69%]
  ....................................................F
  =================================== FAILURES ===================================
  __________________ ChunkedEvenTests.test_negative_chunk_size ___________________
  ValueError: Indices for islice() must be None or an integer: 0 <= x <= sys.maxsize.
  
  During handling of the above exception, another exception occurred:
  
  self = <tests.test_more.ChunkedEvenTests testMethod=test_negative_chunk_size>
  
      def test_negative_chunk_size(self):
          source = iter('ABC')
  >       with self.assertRaisesRegex(ValueError, 'n must be at least 0'):
  E       AssertionError: "n must be at least 0" does not match "Indices for islice() must be None or an integer: 0 <= x <= sys.maxsize."
  
  tests/test_more.py:5566: AssertionError
  =========================== short test summary info ============================
  FAILED tests/test_more.py::ChunkedEvenTests::test_negative_chunk_size - Asser...
  !!!!!!!!!!!!!!!!!!!!!!!!!! stopping after 1 failures !!!!!!!!!!!!!!!!!!!!!!!!!!!
  1 failed, 484 passed in 1.02s
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

### Claim 5: Invalid sizes fail before any source consumption and match the rest of the module.

> invalid sizes fail before any source consumption and match the rest of the module.

**Evidence:**

- **Static code check:** `chunked_even` is defined in `more_itertools/more.py` line 4617 (and 1 more place). [code](https://github.com/more-itertools/more-itertools/blob/fbd55137fe47b44f55190c3714c75f1b21bf834d/more_itertools/more.py#L4617)
  <details><summary>Output</summary>

  ```
  4615 | 
  4616 | 
  4617 | def chunked_even(iterable, n):
  4618 |     """Break *iterable* into lists of approximately length *n*.
  4619 |     Items are distributed such the lengths of the lists differ by at most
  4620 |     1 item.
  4621 | 
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

### Claim 6: The new tests `test_zero_chunk_size` and `test_negative_chunk_size` fail on commit `4aeb433` with `islice` errors and pass on this branch.

> The new `test_zero_chunk_size` and `test_negative_chunk_size` fail on `4aeb433` with the `islice` errors and pass on this branch.

**Evidence:**

- **Static code check:** `test_zero_chunk_size` is defined in `tests/test_more.py` line 5557. [code](https://github.com/more-itertools/more-itertools/blob/fbd55137fe47b44f55190c3714c75f1b21bf834d/tests/test_more.py#L5557)
  <details><summary>Output</summary>

  ```
  5555 |         self._test_finite('', 3, [])
  5556 | 
  5557 |     def test_zero_chunk_size(self):
  5558 |         self._test_finite('ABC', 0, [])
  5559 | 
  5560 |         source = iter('ABC')
  5561 |         self.assertEqual(list(mi.chunked_even(source, 0)), [])
  ```
  </details>

- **Static code check:** `test_negative_chunk_size` is defined in `tests/test_more.py` line 5564. [code](https://github.com/more-itertools/more-itertools/blob/fbd55137fe47b44f55190c3714c75f1b21bf834d/tests/test_more.py#L5564)
  <details><summary>Output</summary>

  ```
  5562 |         self.assertEqual(list(source), list('ABC'))
  5563 | 
  5564 |     def test_negative_chunk_size(self):
  5565 |         source = iter('ABC')
  5566 |         with self.assertRaisesRegex(ValueError, 'n must be at least 0'):
  5567 |             list(mi.chunked_even(source, -1))
  5568 |         self.assertEqual(list(source), list('ABC'))
  ```
  </details>

- **Failing test:** The PR's tests fail without its code changes and pass with them (more-itertools/more-itertools 4aeb433..fbd5513), so they demonstrate the fix.
  <details><summary>Output</summary>

  ```
  # pytest tests/test_more.py
  ## with the PR's changes: exit 0
  ........................................................................ [ 11%]
  ........................................................................ [ 23%]
  ........................................................................ [ 34%]
  ........................................................................ [ 46%]
  ........................................................................ [ 57%]
  ........................................................................ [ 69%]
  ........................................................................ [ 81%]
  ........................................................................ [ 92%]
  ..............................................                           [100%]
  622 passed in 5.49s
  ## with the PR's code changes reverted (tests kept): exit 1
  ........................................................................ [ 11%]
  ........................................................................ [ 23%]
  ........................................................................ [ 34%]
  ........................................................................ [ 46%]
  ........................................................................ [ 57%]
  ........................................................................ [ 69%]
  ....................................................F
  =================================== FAILURES ===================================
  __________________ ChunkedEvenTests.test_negative_chunk_size ___________________
  ValueError: Indices for islice() must be None or an integer: 0 <= x <= sys.maxsize.
  
  During handling of the above exception, another exception occurred:
  
  self = <tests.test_more.ChunkedEvenTests testMethod=test_negative_chunk_size>
  
      def test_negative_chunk_size(self):
          source = iter('ABC')
  >       with self.assertRaisesRegex(ValueError, 'n must be at least 0'):
  E       AssertionError: "n must be at least 0" does not match "Indices for islice() must be None or an integer: 0 <= x <= sys.maxsize."
  
  tests/test_more.py:5566: AssertionError
  =========================== short test summary info ============================
  FAILED tests/test_more.py::ChunkedEvenTests::test_negative_chunk_size - Asser...
  !!!!!!!!!!!!!!!!!!!!!!!!!! stopping after 1 failures !!!!!!!!!!!!!!!!!!!!!!!!!!!
  1 failed, 484 passed in 1.02s
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

### Claim 7: The new tests assert that the source iterator is untouched after an error or empty result.

> They also assert the source iterator is untouched after the error/empty result.

**Evidence:**

- **Static code check:** `test_zero_chunk_size` is defined in `tests/test_more.py` line 5557. [code](https://github.com/more-itertools/more-itertools/blob/fbd55137fe47b44f55190c3714c75f1b21bf834d/tests/test_more.py#L5557)
  <details><summary>Output</summary>

  ```
  5555 |         self._test_finite('', 3, [])
  5556 | 
  5557 |     def test_zero_chunk_size(self):
  5558 |         self._test_finite('ABC', 0, [])
  5559 | 
  5560 |         source = iter('ABC')
  5561 |         self.assertEqual(list(mi.chunked_even(source, 0)), [])
  ```
  </details>

- **Static code check:** `test_negative_chunk_size` is defined in `tests/test_more.py` line 5564. [code](https://github.com/more-itertools/more-itertools/blob/fbd55137fe47b44f55190c3714c75f1b21bf834d/tests/test_more.py#L5564)
  <details><summary>Output</summary>

  ```
  5562 |         self.assertEqual(list(source), list('ABC'))
  5563 | 
  5564 |     def test_negative_chunk_size(self):
  5565 |         source = iter('ABC')
  5566 |         with self.assertRaisesRegex(ValueError, 'n must be at least 0'):
  5567 |             list(mi.chunked_even(source, -1))
  5568 |         self.assertEqual(list(source), list('ABC'))
  ```
  </details>

- **Failing test:** The PR's tests fail without its code changes and pass with them (more-itertools/more-itertools 4aeb433..fbd5513), so they demonstrate the fix.
  <details><summary>Output</summary>

  ```
  # pytest tests/test_more.py
  ## with the PR's changes: exit 0
  ........................................................................ [ 11%]
  ........................................................................ [ 23%]
  ........................................................................ [ 34%]
  ........................................................................ [ 46%]
  ........................................................................ [ 57%]
  ........................................................................ [ 69%]
  ........................................................................ [ 81%]
  ........................................................................ [ 92%]
  ..............................................                           [100%]
  622 passed in 5.49s
  ## with the PR's code changes reverted (tests kept): exit 1
  ........................................................................ [ 11%]
  ........................................................................ [ 23%]
  ........................................................................ [ 34%]
  ........................................................................ [ 46%]
  ........................................................................ [ 57%]
  ........................................................................ [ 69%]
  ....................................................F
  =================================== FAILURES ===================================
  __________________ ChunkedEvenTests.test_negative_chunk_size ___________________
  ValueError: Indices for islice() must be None or an integer: 0 <= x <= sys.maxsize.
  
  During handling of the above exception, another exception occurred:
  
  self = <tests.test_more.ChunkedEvenTests testMethod=test_negative_chunk_size>
  
      def test_negative_chunk_size(self):
          source = iter('ABC')
  >       with self.assertRaisesRegex(ValueError, 'n must be at least 0'):
  E       AssertionError: "n must be at least 0" does not match "Indices for islice() must be None or an integer: 0 <= x <= sys.maxsize."
  
  tests/test_more.py:5566: AssertionError
  =========================== short test summary info ============================
  FAILED tests/test_more.py::ChunkedEvenTests::test_negative_chunk_size - Asser...
  !!!!!!!!!!!!!!!!!!!!!!!!!! stopping after 1 failures !!!!!!!!!!!!!!!!!!!!!!!!!!!
  1 failed, 484 passed in 1.02s
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

### Claim 8: `pytest -q` passed with 767 tests and 21,194 subtests.

> `pytest -q` → 767 passed, 21,194 subtests passed.

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 9: `ruff check more_itertools tests` and `ruff format --check more_itertools tests` passed.

> `ruff check more_itertools tests` and `ruff format --check more_itertools tests` pass.

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

---
Generated by Pramaan at 2026-10-31T21:35:48.063Z using gemma4:e2b-it-qat. Verdicts come from code checks, not from the model.

