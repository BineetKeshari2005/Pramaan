# Pramaan evidence report: D4Vinci/Scrapling#[524](https://github.com/D4Vinci/Scrapling/issues/524)

**Verified commit:** [fd53131](https://github.com/D4Vinci/Scrapling/commit/fd531313a499092d8471bf24a0e08dc5771f2b40)

**Suggested label:** **Needs more information**
The evidence is not strong enough for a verdict; the report needs more detail.

**Best guess if a label must be chosen:** Could not reproduce: The claims could not be checked and the report gives no trace or steps to reproduce. _(a guess from fixed evidence rules, not a verdict)_

_Suggested label only — Pramaan never closes issues._

| # | Claim | Verdict | Confidence | Human review |
|---|---|---|---|---|
| 1 | The call to `self._wait_for_networkidle(page)` immediately after clicking the challenge in `scrapling/engines/_browsers/_stealth.py` has no timeout. | Reproduced | Medium | No |
| 2 | With `timeout=None`, `page.wait_for_load_state("networkidle", timeout=None)` falls back to the page default, which is set to the user-supplied timeout. | Insufficient evidence | Low | Yes |
| 3 | Measured on v0.4.15 and v0.5, `_wait_for_networkidle(timeout=5000)` takes 5.0 s, while `_wait_for_networkidle(timeout=None)` takes 60.0 s. | Insufficient evidence | Low | Yes |
| 4 | The post-click wait should be bounded by the remaining fetch budget, or at minimum by the same 5000 ms used elsewhere. | Insufficient evidence | None | Yes |

### Claim 1: The call to `self._wait_for_networkidle(page)` immediately after clicking the challenge in `scrapling/engines/_browsers/_stealth.py` has no timeout.

> page.mouse.click(captcha_x, captcha_y, delay=randint(100, 200), button="left")
> self._wait_for_networkidle(page)          # &lt;-- no timeout

**Evidence:**

- **Static code check:** File `scrapling/engines/_browsers/_stealth.py` exists in D4Vinci/Scrapling at fd53131. [code](https://github.com/D4Vinci/Scrapling/blob/fd531313a499092d8471bf24a0e08dc5771f2b40/scrapling/engines/_browsers/_stealth.py)

- **Static code check:** `_wait_for_networkidle` is defined in `scrapling/engines/_browsers/_base.py` line 176 (and 1 more place). [code](https://github.com/D4Vinci/Scrapling/blob/fd531313a499092d8471bf24a0e08dc5771f2b40/scrapling/engines/_browsers/_base.py#L176)
  <details><summary>Output</summary>

  ```
  174 | 
  175 |     @staticmethod
  176 |     def _wait_for_networkidle(page: Page | Frame, timeout: Optional[int] = None):
  177 |         """Wait for the page to become idle (no network activity) even if there are never-ending requests."""
  178 |         try:
  179 |             page.wait_for_load_state("networkidle", timeout=timeout)
  180 |         except Exception:
  ```
  </details>

- **Static code check:** Line 209 of `scrapling/engines/_browsers/_stealth.py` exists; the code there is shown below. [code](https://github.com/D4Vinci/Scrapling/blob/fd531313a499092d8471bf24a0e08dc5771f2b40/scrapling/engines/_browsers/_stealth.py#L209)
  <details><summary>Output</summary>

  ```
  206 |                 captcha_x, captcha_y = outer_box["x"] + randint(26, 28), outer_box["y"] + randint(25, 27)
  207 | 
  208 |                 # Move the mouse to the center of the window, then press and hold the left mouse button
  209 |                 page.mouse.click(captcha_x, captcha_y, delay=randint(100, 200), button="left")
  210 |                 self._wait_for_networkidle(page)
  211 | 
  212 |                 if challenge_type != "embedded":
  ```
  </details>

- **Static code check:** Line 210 of `scrapling/engines/_browsers/_stealth.py` exists; the code there is shown below. [code](https://github.com/D4Vinci/Scrapling/blob/fd531313a499092d8471bf24a0e08dc5771f2b40/scrapling/engines/_browsers/_stealth.py#L210)
  <details><summary>Output</summary>

  ```
  207 | 
  208 |                 # Move the mouse to the center of the window, then press and hold the left mouse button
  209 |                 page.mouse.click(captcha_x, captcha_y, delay=randint(100, 200), button="left")
  210 |                 self._wait_for_networkidle(page)
  211 | 
  212 |                 if challenge_type != "embedded":
  213 |                     attempts = 0
  ```
  </details>

**What is missing:**

- None

### Claim 2: With `timeout=None`, `page.wait_for_load_state("networkidle", timeout=None)` falls back to the page default, which is set to the user-supplied timeout.

> With `timeout=None`, `page.wait_for_load_state("networkidle", timeout=None)` falls back to the page default, which `_base.py` sets to the user-supplied `timeout`.

**Evidence:**

- **Static code check:** File `scrapling/engines/_browsers/_base.py` exists in D4Vinci/Scrapling at fd53131. [code](https://github.com/D4Vinci/Scrapling/blob/fd531313a499092d8471bf24a0e08dc5771f2b40/scrapling/engines/_browsers/_base.py)

- **Text only:** `wait_for_load_state` appears in `scrapling/core/ai/_browser_actions.py` line 211, but no definition was found (it may come from a dependency or be generated). [code](https://github.com/D4Vinci/Scrapling/blob/fd531313a499092d8471bf24a0e08dc5771f2b40/scrapling/core/ai/_browser_actions.py#L211)
  <details><summary>Output</summary>

  ```
  await page.wait_for_load_state(action["state"], timeout=action.get("timeout", 30000))
  ```
  </details>

- **Static code check:** Line 1 of `scrapling/engines/_browsers/_base.py` exists; the code there is shown below. [code](https://github.com/D4Vinci/Scrapling/blob/fd531313a499092d8471bf24a0e08dc5771f2b40/scrapling/engines/_browsers/_base.py#L1)
  <details><summary>Output</summary>

  ```
  1 | from time import time
  2 | from pathlib import Path
  3 | from asyncio import sleep as asyncio_sleep, Lock
  4 | from contextlib import contextmanager, asynccontextmanager, suppress
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

- The report includes a Python snippet, but the Docker sandbox is not running, so it was not executed.

### Claim 3: Measured on v0.4.15 and v0.5, `_wait_for_networkidle(timeout=5000)` takes 5.0 s, while `_wait_for_networkidle(timeout=None)` takes 60.0 s.

> _wait_for_networkidle(timeout=5000)  →  5.0 s
> _wait_for_networkidle(timeout=None)  → 60.0 s     # page timeout = 60 s

**Evidence:**

- **Static code check:** `_wait_for_networkidle` is defined in `scrapling/engines/_browsers/_base.py` line 176 (and 1 more place). [code](https://github.com/D4Vinci/Scrapling/blob/fd531313a499092d8471bf24a0e08dc5771f2b40/scrapling/engines/_browsers/_base.py#L176)
  <details><summary>Output</summary>

  ```
  174 | 
  175 |     @staticmethod
  176 |     def _wait_for_networkidle(page: Page | Frame, timeout: Optional[int] = None):
  177 |         """Wait for the page to become idle (no network activity) even if there are never-ending requests."""
  178 |         try:
  179 |             page.wait_for_load_state("networkidle", timeout=timeout)
  180 |         except Exception:
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

- The report includes a Python snippet, but the Docker sandbox is not running, so it was not executed.

### Claim 4: The post-click wait should be bounded by the remaining fetch budget, or at minimum by the same 5000 ms used elsewhere.

> The post-click wait should be bounded by the remaining fetch budget, or at minimum by the same 5000 ms the other call sites use.

**Evidence:**

- No evidence recorded

**What is missing:**

- The report includes a Python snippet, but the Docker sandbox is not running, so it was not executed.

---
Generated by Pramaan at 2026-10-31T21:12:30.834Z using gemma4:e2b-it-qat. Verdicts come from code checks, not from the model.
