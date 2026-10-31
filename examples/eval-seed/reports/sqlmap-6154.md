# Pramaan evidence report: sqlmapproject/sqlmap#[6154](https://github.com/sqlmapproject/sqlmap/issues/6154)

**Verified commit:** [11afdcb](https://github.com/sqlmapproject/sqlmap/commit/11afdcb02640211826b71af11a646a87157d223f)

**Suggested label:** **Needs more information**
The evidence is not strong enough for a verdict; the report needs more detail.

**Best guess if a label must be chosen:** Confirmed: The report gives a trace or steps, and the code it names exists at the checked commit. _(a guess from fixed evidence rules, not a verdict)_

_Suggested label only — Pramaan never closes issues._

| # | Claim | Verdict | Confidence | Human review |
|---|---|---|---|---|
| 1 | The running version is 1.10.10.18#dev. | Insufficient evidence | None | No |
| 2 | The Python version is 3.14.7. | Insufficient evidence | None | No |
| 3 | The operating system is Windows-10-10.0.19045-SP0. | Insufficient evidence | None | No |
| 4 | An AttributeError is raised when calling conf.dumper.singleString(conf.dbmsHandler.getFingerprint()). | Insufficient evidence | Low | Yes |

### Claim 1: The running version is 1.10.10.18#dev.

> Running version: 1.10.10.18#dev

**Evidence:**

- No evidence recorded

**What is missing:**

- Recorded as context: environment and version details are not verified against the code.

### Claim 2: The Python version is 3.14.7.

> Python version: 3.14.7

**Evidence:**

- No evidence recorded

**What is missing:**

- Recorded as context: environment and version details are not verified against the code.

### Claim 3: The operating system is Windows-10-10.0.19045-SP0.

> Operating system: Windows-10-10.0.19045-SP0

**Evidence:**

- No evidence recorded

**What is missing:**

- Recorded as context: environment and version details are not verified against the code.

### Claim 4: An AttributeError is raised when calling conf.dumper.singleString(conf.dbmsHandler.getFingerprint()).

> AttributeError: 'NoneType' object has no attribute 'getFingerprint'

**Evidence:**

- **Static code check:** File `lib/controller/action.py` exists in sqlmapproject/sqlmap at 11afdcb. [code](https://github.com/sqlmapproject/sqlmap/blob/11afdcb02640211826b71af11a646a87157d223f/lib/controller/action.py)

- **Static code check:** `singleString` is defined in `lib/core/dump.py` line 140 (and 2 more places). [code](https://github.com/sqlmapproject/sqlmap/blob/11afdcb02640211826b71af11a646a87157d223f/lib/core/dump.py#L140)
  <details><summary>Output</summary>

  ```
  138 |             raise SqlmapGenericException(errMsg)
  139 | 
  140 |     def singleString(self, data, content_type=None):
  141 |         self._reportData(data, content_type)
  142 |         self._write(data, content_type=content_type)
  143 | 
  144 |     def string(self, header, data, content_type=None, sort=True):
  ```
  </details>

- **Text only:** `dbmsHandler` appears in `doc/ARCHITECTURE.md` line 92, but no definition was found (it may come from a dependency or be generated). [code](https://github.com/sqlmapproject/sqlmap/blob/11afdcb02640211826b71af11a646a87157d223f/doc/ARCHITECTURE.md#L92)
  <details><summary>Output</summary>

  ```
  back-end DBMS and assigns `conf.dbmsHandler`, the object through which all
  ```
  </details>

- **Static code check:** `getFingerprint` is defined in `extra/esperanto/handler.py` line 131 (and 2 more places). [code](https://github.com/sqlmapproject/sqlmap/blob/11afdcb02640211826b71af11a646a87157d223f/extra/esperanto/handler.py#L131)
  <details><summary>Output</summary>

  ```
  129 |             return self._scopeDb() or "<current>"
  130 | 
  131 |         def getFingerprint(self):
  132 |             # concise fingerprint only; the version banner is shown for --banner, not
  133 |             # printed unbidden on every run (and not re-extracted here)
  134 |             product = self._engine().identify().get("product") or "unknown"
  135 |             return "back-end DBMS: %s (via Esperanto DBMS-agnostic engine)" % product
  ```
  </details>

- **Static code check:** Line 108 of `lib/controller/action.py` exists; the code there is shown below. [code](https://github.com/sqlmapproject/sqlmap/blob/11afdcb02640211826b71af11a646a87157d223f/lib/controller/action.py#L108)
  <details><summary>Output</summary>

  ```
  105 | 
  106 |         raise SqlmapUnsupportedDBMSException(errMsg)
  107 | 
  108 |     conf.dumper.singleString(conf.dbmsHandler.getFingerprint())
  109 | 
  110 |     kb.fingerprinted = True
  111 | 
  ```
  </details>

- **Static code check:** All 4 stack frames inside the repository match the code at 11afdcb, so the trace is consistent with this code path.

- **Static code check:** Frame `sqlmap.py:268` in `main` matches the code. [code](https://github.com/sqlmapproject/sqlmap/blob/11afdcb02640211826b71af11a646a87157d223f/sqlmap.py#L268)
  <details><summary>Output</summary>

  ```
  266 |                                         start()
  267 |                         else:
  268 |                             start()
  269 |                     except Exception as ex:
  270 |                         os._exitcode = 1
  ```
  </details>

- **Static code check:** Frame `lib/core/decorators.py:108` in `_` matches the code. [code](https://github.com/sqlmapproject/sqlmap/blob/11afdcb02640211826b71af11a646a87157d223f/lib/core/decorators.py#L108)
  <details><summary>Output</summary>

  ```
  106 | 
  107 |         try:
  108 |             result = f(*args, **kwargs)
  109 |         finally:
  110 |             if len(threadData.valueStack) > originalLevel:
  ```
  </details>

- **Static code check:** Frame `lib/controller/controller.py:906` in `start` matches the code. [code](https://github.com/sqlmapproject/sqlmap/blob/11afdcb02640211826b71af11a646a87157d223f/lib/controller/controller.py#L906)
  <details><summary>Output</summary>

  ```
  904 |                 if condition:
  905 |                     try:
  906 |                         action()
  907 |                     finally:
  908 |                         if conf.proof:
  ```
  </details>

- **Static code check:** Frame `lib/controller/action.py:108` in `action` matches the code. [code](https://github.com/sqlmapproject/sqlmap/blob/11afdcb02640211826b71af11a646a87157d223f/lib/controller/action.py#L108)
  <details><summary>Output</summary>

  ```
  106 |         raise SqlmapUnsupportedDBMSException(errMsg)
  107 | 
  108 |     conf.dumper.singleString(conf.dbmsHandler.getFingerprint())
  109 | 
  110 |     kb.fingerprinted = True
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

- The crash itself was not reproduced by running the reported command.

---
Generated by Pramaan at 2026-10-31T20:38:52.968Z using gemma4:e2b-it-qat. Verdicts come from code checks, not from the model.
