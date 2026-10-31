# Pramaan evidence report: sqlmapproject/sqlmap#[6135](https://github.com/sqlmapproject/sqlmap/issues/6135)

**Verified commit:** [1d9965d](https://github.com/sqlmapproject/sqlmap/commit/1d9965d0033d7a0e9e8bfd9cb066a5e4cb55b590)

**Suggested label:** **Needs more information**
The evidence is not strong enough for a verdict; the report needs more detail.

**Best guess if a label must be chosen:** Confirmed: The report gives a trace or steps, and the code it names exists at the checked commit. _(a guess from fixed evidence rules, not a verdict)_

_Suggested label only — Pramaan never closes issues._

| # | Claim | Verdict | Confidence | Human review |
|---|---|---|---|---|
| 1 | The running version of sqlmap is 1.10.8#stable. | Insufficient evidence | None | No |
| 2 | The Python version used is 3.14.7. | Insufficient evidence | None | No |
| 3 | The operating system is Linux-7.1.5+****-amd64-x86_64-with-glibc2.43. | Insufficient evidence | None | No |
| 4 | Running the provided command line results in a NameError: name 'cleanupVals' is not defined. | Insufficient evidence | Low | No |

### Claim 1: The running version of sqlmap is 1.10.8#stable.

> Running version: 1.10.8#stable

**Evidence:**

- No evidence recorded

**What is missing:**

- Recorded as context: environment and version details are not verified against the code.

### Claim 2: The Python version used is 3.14.7.

> Python version: 3.14.7

**Evidence:**

- No evidence recorded

**What is missing:**

- Recorded as context: environment and version details are not verified against the code.

### Claim 3: The operating system is Linux-7.1.5+****-amd64-x86_64-with-glibc2.43.

> Operating system: Linux-7.1.5+****-amd64-x86_64-with-glibc2.43

**Evidence:**

- No evidence recorded

**What is missing:**

- Recorded as context: environment and version details are not verified against the code.

### Claim 4: Running the provided command line results in a NameError: name 'cleanupVals' is not defined.

> NameError: name 'cleanupVals' is not defined

**Evidence:**

- **Static code check:** File `lib/parse/payloads.py` exists in sqlmapproject/sqlmap at 1d9965d. [code](https://github.com/sqlmapproject/sqlmap/blob/1d9965d0033d7a0e9e8bfd9cb066a5e4cb55b590/lib/parse/payloads.py)

- **Static code check:** `cleanupVals` is defined in `lib/parse/payloads.py` line 21. [code](https://github.com/sqlmapproject/sqlmap/blob/1d9965d0033d7a0e9e8bfd9cb066a5e4cb55b590/lib/parse/payloads.py#L21)
  <details><summary>Output</summary>

  ```
  19 | from lib.core.settings import PAYLOAD_XML_FILES
  20 | 
  21 | def cleanupVals(text, tag):
  22 |     if tag == "clause" and '-' in text:
  23 |         text = re.sub(r"(\d+)-(\d+)", lambda match: ','.join(str(_) for _ in xrange(int(match.group(1)), int(match.group(2)) + 1)), text)
  24 | 
  25 |     if tag in ("clause", "where"):
  ```
  </details>

- **Static code check:** Line 61 of `lib/parse/payloads.py` exists; the code there is shown below. [code](https://github.com/sqlmapproject/sqlmap/blob/1d9965d0033d7a0e9e8bfd9cb066a5e4cb55b590/lib/parse/payloads.py#L61)
  <details><summary>Output</summary>

  ```
  58 | 
  59 |         for child in element.findall("*"):
  60 |             if child.text and child.text.strip():
  61 |                 values = cleanupVals(child.text, child.tag)
  62 |                 test[child.tag] = values
  63 |             else:
  64 |                 progeny = child.findall("*")
  ```
  </details>

- **Static code check:** All 3 stack frames inside the repository match the code at 1d9965d (1 frame outside the repository was skipped), so the trace is consistent with this code path.

- **Static code check:** Frame `lib/core/option.py:3167` in `init` matches the code. [code](https://github.com/sqlmapproject/sqlmap/blob/1d9965d0033d7a0e9e8bfd9cb066a5e4cb55b590/lib/core/option.py#L3167)
  <details><summary>Output</summary>

  ```
  3165 |     _setProxyList()
  3166 |     _setTorProxySettings()
  3167 |     _setDNSServer()
  3168 |     _adjustLoggingFormatter()
  3169 |     _setMultipleTargets()
  ```
  </details>

- **Static code check:** Frame `lib/parse/payloads.py:123` in `loadPayloads` matches the code. [code](https://github.com/sqlmapproject/sqlmap/blob/1d9965d0033d7a0e9e8bfd9cb066a5e4cb55b590/lib/parse/payloads.py#L123)
  <details><summary>Output</summary>

  ```
  121 |             errMsg += "the file '%s' ('%s'). Please make " % (payloadFilePath, getSafeExString(ex))
  122 |             errMsg += "sure that you haven't made any changes to it"
  123 |             raise SqlmapInstallationException(errMsg)
  124 | 
  125 |         root = doc.getroot()
  ```
  </details>

- **Static code check:** Frame `lib/parse/payloads.py:61` in `parseXmlNode` matches the code. [code](https://github.com/sqlmapproject/sqlmap/blob/1d9965d0033d7a0e9e8bfd9cb066a5e4cb55b590/lib/parse/payloads.py#L61)
  <details><summary>Output</summary>

  ```
  59 |         for child in element.findall("*"):
  60 |             if child.text and child.text.strip():
  61 |                 values = cleanupVals(child.text, child.tag)
  62 |                 test[child.tag] = values
  63 |             else:
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

- The crash itself was not reproduced by running the reported command.

---
Generated by Pramaan at 2026-10-31T22:56:16.370Z using gemma4:e2b-it-qat. Verdicts come from code checks, not from the model.
