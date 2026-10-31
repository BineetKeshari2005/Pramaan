# Pramaan evidence report: moritzgloeckl/overleaf-sync#[54](https://github.com/moritzgloeckl/overleaf-sync/issues/54)

**Verified commit:** [0af515b](https://github.com/moritzgloeckl/overleaf-sync/commit/0af515b1d6e6e885af7034afdb557605b68d15ca)

**Suggested label:** **Needs more information**
The evidence is not strong enough for a verdict; the report needs more detail.

**Best guess if a label must be chosen:** Confirmed: The report gives a trace or steps, and the code it names exists at the checked commit. _(a guess from fixed evidence rules, not a verdict)_

_Suggested label only — Pramaan never closes issues._

| # | Claim | Verdict | Confidence | Human review |
|---|---|---|---|---|
| 1 | Calling `ols` raises an `ImportError` when importing `PyQt5.QtWebEngineWidgets` due to an undefined symbol. | Insufficient evidence | Low | No |
| 2 | Calling `ols` raises a `ModuleNotFoundError` for the `olclient` module. | Insufficient evidence | Low | No |
| 3 | The reported errors occurred after performing a fresh `pip3 install`. | Insufficient evidence | None | No |

### Claim 1: Calling `ols` raises an `ImportError` when importing `PyQt5.QtWebEngineWidgets` due to an undefined symbol.

> ImportError: /usr/lib/x86_64-linux-gnu/libfontconfig.so.1: undefined symbol: uuid_generate_sha1, version UUID_2.31

**Evidence:**

- **Static code check:** File `olsync/olsync.py` exists in moritzgloeckl/overleaf-sync at 0af515b. [code](https://github.com/moritzgloeckl/overleaf-sync/blob/0af515b1d6e6e885af7034afdb557605b68d15ca/olsync/olsync.py)

- **Static code check:** File `olsync/olbrowserlogin.py` exists in moritzgloeckl/overleaf-sync at 0af515b. [code](https://github.com/moritzgloeckl/overleaf-sync/blob/0af515b1d6e6e885af7034afdb557605b68d15ca/olsync/olbrowserlogin.py)

- **Static code check:** Line 26 of `olsync/olsync.py` exists; the code there is shown below. [code](https://github.com/moritzgloeckl/overleaf-sync/blob/0af515b1d6e6e885af7034afdb557605b68d15ca/olsync/olsync.py#L26)
  <details><summary>Output</summary>

  ```
  23 | 
  24 | try:
  25 |     # Import for pip installation / wheel
  26 |     from olsync.olclient import OverleafClient
  27 |     import olsync.olbrowserlogin as olbrowserlogin
  28 | except ImportError:
  29 |     # Import for development
  ```
  </details>

- **Static code check:** Line 14 of `olsync/olbrowserlogin.py` exists; the code there is shown below. [code](https://github.com/moritzgloeckl/overleaf-sync/blob/0af515b1d6e6e885af7034afdb557605b68d15ca/olsync/olbrowserlogin.py#L14)
  <details><summary>Output</summary>

  ```
  11 | from PySide6.QtCore import *
  12 | from PySide6.QtWidgets import *
  13 | from PySide6.QtWebEngineWidgets import *
  14 | from PySide6.QtWebEngineCore import QWebEngineProfile, QWebEngineSettings, QWebEnginePage
  15 | 
  16 | # Where to get the CSRF Token and where to send the login request to
  17 | LOGIN_URL = "https://www.overleaf.com/login"
  ```
  </details>

- **Static code check:** All 3 stack frames inside the repository match the code at 0af515b (1 frame outside the repository was skipped), so the trace is consistent with this code path.

- **Static code check:** Frame `olsync/olsync.py:26` in `&lt;module&gt;` matches the code. [code](https://github.com/moritzgloeckl/overleaf-sync/blob/0af515b1d6e6e885af7034afdb557605b68d15ca/olsync/olsync.py#L26)
  <details><summary>Output</summary>

  ```
  24 | try:
  25 |     # Import for pip installation / wheel
  26 |     from olsync.olclient import OverleafClient
  27 |     import olsync.olbrowserlogin as olbrowserlogin
  28 | except ImportError:
  ```
  </details>

- **Static code check:** Frame `olsync/olbrowserlogin.py:14` in `&lt;module&gt;` matches the code. [code](https://github.com/moritzgloeckl/overleaf-sync/blob/0af515b1d6e6e885af7034afdb557605b68d15ca/olsync/olbrowserlogin.py#L14)
  <details><summary>Output</summary>

  ```
  12 | from PySide6.QtWidgets import *
  13 | from PySide6.QtWebEngineWidgets import *
  14 | from PySide6.QtWebEngineCore import QWebEngineProfile, QWebEngineSettings, QWebEnginePage
  15 | 
  16 | # Where to get the CSRF Token and where to send the login request to
  ```
  </details>

- **Static code check:** Frame `olsync/olsync.py:29` in `&lt;module&gt;` matches the code. [code](https://github.com/moritzgloeckl/overleaf-sync/blob/0af515b1d6e6e885af7034afdb557605b68d15ca/olsync/olsync.py#L29)
  <details><summary>Output</summary>

  ```
  27 |     import olsync.olbrowserlogin as olbrowserlogin
  28 | except ImportError:
  29 |     # Import for development
  30 |     from olclient import OverleafClient
  31 |     import olbrowserlogin
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

- The crash itself was not reproduced by running the reported command.

### Claim 2: Calling `ols` raises a `ModuleNotFoundError` for the `olclient` module.

> ModuleNotFoundError: No module named 'olclient'

**Evidence:**

- **Static code check:** File `olsync/olsync.py` exists in moritzgloeckl/overleaf-sync at 0af515b. [code](https://github.com/moritzgloeckl/overleaf-sync/blob/0af515b1d6e6e885af7034afdb557605b68d15ca/olsync/olsync.py)

- **Static code check:** Line 29 of `olsync/olsync.py` exists; the code there is shown below. [code](https://github.com/moritzgloeckl/overleaf-sync/blob/0af515b1d6e6e885af7034afdb557605b68d15ca/olsync/olsync.py#L29)
  <details><summary>Output</summary>

  ```
  26 |     from olsync.olclient import OverleafClient
  27 |     import olsync.olbrowserlogin as olbrowserlogin
  28 | except ImportError:
  29 |     # Import for development
  30 |     from olclient import OverleafClient
  31 |     import olbrowserlogin
  32 | 
  ```
  </details>

- **Static code check:** All 3 stack frames inside the repository match the code at 0af515b (1 frame outside the repository was skipped), so the trace is consistent with this code path.

- **Static code check:** Frame `olsync/olsync.py:26` in `&lt;module&gt;` matches the code. [code](https://github.com/moritzgloeckl/overleaf-sync/blob/0af515b1d6e6e885af7034afdb557605b68d15ca/olsync/olsync.py#L26)
  <details><summary>Output</summary>

  ```
  24 | try:
  25 |     # Import for pip installation / wheel
  26 |     from olsync.olclient import OverleafClient
  27 |     import olsync.olbrowserlogin as olbrowserlogin
  28 | except ImportError:
  ```
  </details>

- **Static code check:** Frame `olsync/olbrowserlogin.py:14` in `&lt;module&gt;` matches the code. [code](https://github.com/moritzgloeckl/overleaf-sync/blob/0af515b1d6e6e885af7034afdb557605b68d15ca/olsync/olbrowserlogin.py#L14)
  <details><summary>Output</summary>

  ```
  12 | from PySide6.QtWidgets import *
  13 | from PySide6.QtWebEngineWidgets import *
  14 | from PySide6.QtWebEngineCore import QWebEngineProfile, QWebEngineSettings, QWebEnginePage
  15 | 
  16 | # Where to get the CSRF Token and where to send the login request to
  ```
  </details>

- **Static code check:** Frame `olsync/olsync.py:29` in `&lt;module&gt;` matches the code. [code](https://github.com/moritzgloeckl/overleaf-sync/blob/0af515b1d6e6e885af7034afdb557605b68d15ca/olsync/olsync.py#L29)
  <details><summary>Output</summary>

  ```
  27 |     import olsync.olbrowserlogin as olbrowserlogin
  28 | except ImportError:
  29 |     # Import for development
  30 |     from olclient import OverleafClient
  31 |     import olbrowserlogin
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

- The crash itself was not reproduced by running the reported command.

### Claim 3: The reported errors occurred after performing a fresh `pip3 install`.

> This is after I do a fresh pip3 install.

**Evidence:**

- No evidence recorded

**What is missing:**

- Recorded as context: environment and version details are not verified against the code.

---
Generated by Pramaan at 2026-10-31T22:25:41.867Z using gemma4:e2b-it-qat. Verdicts come from code checks, not from the model.
