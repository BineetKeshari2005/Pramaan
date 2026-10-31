# Pramaan evidence report: rocky/python-decompile3#[158](https://github.com/rocky/python-decompile3/issues/158)

**Verified commit:** [ed375df](https://github.com/rocky/python-decompile3/commit/ed375df6b21ecbddd21cf6aaa37c7673da876751)

**Suggested label:** **Needs more information**
The evidence is not strong enough for a verdict; the report needs more detail.

**Best guess if a label must be chosen:** Confirmed: The report gives a trace or steps, and the code it names exists at the checked commit. _(a guess from fixed evidence rules, not a verdict)_

_Suggested label only — Pramaan never closes issues._

| # | Claim | Verdict | Confidence | Human review |
|---|---|---|---|---|
| 1 | Calling decompyle3 on logh_gui.pyc raises an AttributeError: 'Instruction' object has no attribute 'tos_str'. | Insufficient evidence | Low | No |
| 2 | The user is running decompyle3 version 3.9.1.dev0 and Python bytecode version base 3.7.0. | Insufficient evidence | Low | No |
| 3 | The error occurs when attempting to access the 'tos_str' attribute on an 'Instruction' object within Scanner37Base.ingest. | Reproduced | Medium | No |
| 4 | The environment uses uncompyle6 version 3.9.0 and xdis version 6.0.5. | Insufficient evidence | None | No |
| 5 | The user observed that using the git version of xdis worked, suggesting a discrepancy between the installed version and the git version. | Insufficient evidence | Low | No |

### Claim 1: Calling decompyle3 on logh_gui.pyc raises an AttributeError: 'Instruction' object has no attribute 'tos_str'.

> AttributeError: 'Instruction' object has no attribute 'tos_str'

**Evidence:**

- **Static code check:** File `decompyle3/scanners/scanner37base.py` exists in rocky/python-decompile3 at ed375df. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/scanners/scanner37base.py)

- **Static code check:** Line 672 of `decompyle3/scanners/scanner37base.py` exists; the code there is shown below. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/scanners/scanner37base.py#L672)
  <details><summary>Output</summary>

  ```
  669 |                     has_arg=inst.has_arg,
  670 |                     opc=self.opc,
  671 |                     has_extended_arg=inst.has_extended_arg,
  672 |                     tos_str=inst.tos_str,
  673 |                     start_offset=inst.start_offset,
  674 |                 ),
  675 |             )
  ```
  </details>

- **Static code check:** All 7 stack frames inside the repository match the code at ed375df (5 frames outside the repository were skipped), so the trace is consistent with this code path.

- **Static code check:** Frame `decompyle3/bin/decompile.py:146` in `main_bin` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/bin/decompile.py#L146)
  <details><summary>Output</summary>

  ```
  144 |         try:
  145 |             show_ast = {"before": tree or tree_plus, "after": tree_plus}
  146 |             result = main(
  147 |                 src_base,
  148 |                 out_base,
  ```
  </details>

- **Static code check:** Frame `decompyle3/main.py:337` in `main` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/main.py#L337)
  <details><summary>Output</summary>

  ```
  335 |         # Try to uncompile the input file
  336 |         try:
  337 |             deparsed_objects = decompile_file(
  338 |                 infile,
  339 |                 outstream,
  ```
  </details>

- **Static code check:** Frame `decompyle3/main.py:238` in `decompile_file` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/main.py#L238)
  <details><summary>Output</summary>

  ```
  236 |     else:
  237 |         deparsed = [
  238 |             decompile(
  239 |                 co,
  240 |                 version,
  ```
  </details>

- **Static code check:** Frame `decompyle3/main.py:158` in `decompile` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/main.py#L158)
  <details><summary>Output</summary>

  ```
  156 |             else:
  157 |                 deparse_fn = code_deparse
  158 |             deparsed = deparse_fn(
  159 |                 co,
  160 |                 out,
  ```
  </details>

- **Static code check:** Frame `decompyle3/semantics/pysource.py:1120` in `code_deparse` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/semantics/pysource.py#L1120)
  <details><summary>Output</summary>

  ```
  1118 |     scanner = get_scanner(version, is_pypy=is_pypy, show_asm=debug_opts["asm"])
  1119 | 
  1120 |     tokens, customize = scanner.ingest(
  1121 |         co, code_objects=code_objects, show_asm=debug_opts["asm"]
  1122 |     )
  ```
  </details>

- **Static code check:** Frame `decompyle3/scanners/scanner37.py:65` in `ingest` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/scanners/scanner37.py#L65)
  <details><summary>Output</summary>

  ```
  63 |         cause specific rules for the specific number of arguments they take.
  64 |         """
  65 |         tokens, customize = Scanner37Base.ingest(
  66 |             self, bytecode, classname, code_objects, show_asm
  67 |         )
  ```
  </details>

- **Static code check:** Frame `decompyle3/scanners/scanner37base.py:672` in `ingest` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/scanners/scanner37base.py#L672)
  <details><summary>Output</summary>

  ```
  670 |                     opc=self.opc,
  671 |                     has_extended_arg=inst.has_extended_arg,
  672 |                     tos_str=inst.tos_str,
  673 |                     start_offset=inst.start_offset,
  674 |                 ),
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

- The crash itself was not reproduced by running the reported command.

### Claim 2: The user is running decompyle3 version 3.9.1.dev0 and Python bytecode version base 3.7.0.

> \# decompyle3 version 3.9.1.dev0
> \# Python bytecode version base 3.7.0 (3394)

**Evidence:**

- **Static code check:** All 7 stack frames inside the repository match the code at ed375df (5 frames outside the repository were skipped), so the trace is consistent with this code path.

- **Static code check:** Frame `decompyle3/bin/decompile.py:146` in `main_bin` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/bin/decompile.py#L146)
  <details><summary>Output</summary>

  ```
  144 |         try:
  145 |             show_ast = {"before": tree or tree_plus, "after": tree_plus}
  146 |             result = main(
  147 |                 src_base,
  148 |                 out_base,
  ```
  </details>

- **Static code check:** Frame `decompyle3/main.py:337` in `main` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/main.py#L337)
  <details><summary>Output</summary>

  ```
  335 |         # Try to uncompile the input file
  336 |         try:
  337 |             deparsed_objects = decompile_file(
  338 |                 infile,
  339 |                 outstream,
  ```
  </details>

- **Static code check:** Frame `decompyle3/main.py:238` in `decompile_file` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/main.py#L238)
  <details><summary>Output</summary>

  ```
  236 |     else:
  237 |         deparsed = [
  238 |             decompile(
  239 |                 co,
  240 |                 version,
  ```
  </details>

- **Static code check:** Frame `decompyle3/main.py:158` in `decompile` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/main.py#L158)
  <details><summary>Output</summary>

  ```
  156 |             else:
  157 |                 deparse_fn = code_deparse
  158 |             deparsed = deparse_fn(
  159 |                 co,
  160 |                 out,
  ```
  </details>

- **Static code check:** Frame `decompyle3/semantics/pysource.py:1120` in `code_deparse` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/semantics/pysource.py#L1120)
  <details><summary>Output</summary>

  ```
  1118 |     scanner = get_scanner(version, is_pypy=is_pypy, show_asm=debug_opts["asm"])
  1119 | 
  1120 |     tokens, customize = scanner.ingest(
  1121 |         co, code_objects=code_objects, show_asm=debug_opts["asm"]
  1122 |     )
  ```
  </details>

- **Static code check:** Frame `decompyle3/scanners/scanner37.py:65` in `ingest` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/scanners/scanner37.py#L65)
  <details><summary>Output</summary>

  ```
  63 |         cause specific rules for the specific number of arguments they take.
  64 |         """
  65 |         tokens, customize = Scanner37Base.ingest(
  66 |             self, bytecode, classname, code_objects, show_asm
  67 |         )
  ```
  </details>

- **Static code check:** Frame `decompyle3/scanners/scanner37base.py:672` in `ingest` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/scanners/scanner37base.py#L672)
  <details><summary>Output</summary>

  ```
  670 |                     opc=self.opc,
  671 |                     has_extended_arg=inst.has_extended_arg,
  672 |                     tos_str=inst.tos_str,
  673 |                     start_offset=inst.start_offset,
  674 |                 ),
  ```
  </details>

**What is missing:**

- The crash itself was not reproduced by running the reported command.

### Claim 3: The error occurs when attempting to access the 'tos_str' attribute on an 'Instruction' object within Scanner37Base.ingest.

> tos_str=inst.tos_str

**Evidence:**

- **Static code check:** File `decompyle3/scanners/scanner37base.py` exists in rocky/python-decompile3 at ed375df. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/scanners/scanner37base.py)

- **Static code check:** Line 672 of `decompyle3/scanners/scanner37base.py` exists; the code there is shown below. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/scanners/scanner37base.py#L672)
  <details><summary>Output</summary>

  ```
  669 |                     has_arg=inst.has_arg,
  670 |                     opc=self.opc,
  671 |                     has_extended_arg=inst.has_extended_arg,
  672 |                     tos_str=inst.tos_str,
  673 |                     start_offset=inst.start_offset,
  674 |                 ),
  675 |             )
  ```
  </details>

- **Static code check:** All 7 stack frames inside the repository match the code at ed375df (5 frames outside the repository were skipped), so the trace is consistent with this code path.

- **Static code check:** Frame `decompyle3/bin/decompile.py:146` in `main_bin` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/bin/decompile.py#L146)
  <details><summary>Output</summary>

  ```
  144 |         try:
  145 |             show_ast = {"before": tree or tree_plus, "after": tree_plus}
  146 |             result = main(
  147 |                 src_base,
  148 |                 out_base,
  ```
  </details>

- **Static code check:** Frame `decompyle3/main.py:337` in `main` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/main.py#L337)
  <details><summary>Output</summary>

  ```
  335 |         # Try to uncompile the input file
  336 |         try:
  337 |             deparsed_objects = decompile_file(
  338 |                 infile,
  339 |                 outstream,
  ```
  </details>

- **Static code check:** Frame `decompyle3/main.py:238` in `decompile_file` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/main.py#L238)
  <details><summary>Output</summary>

  ```
  236 |     else:
  237 |         deparsed = [
  238 |             decompile(
  239 |                 co,
  240 |                 version,
  ```
  </details>

- **Static code check:** Frame `decompyle3/main.py:158` in `decompile` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/main.py#L158)
  <details><summary>Output</summary>

  ```
  156 |             else:
  157 |                 deparse_fn = code_deparse
  158 |             deparsed = deparse_fn(
  159 |                 co,
  160 |                 out,
  ```
  </details>

- **Static code check:** Frame `decompyle3/semantics/pysource.py:1120` in `code_deparse` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/semantics/pysource.py#L1120)
  <details><summary>Output</summary>

  ```
  1118 |     scanner = get_scanner(version, is_pypy=is_pypy, show_asm=debug_opts["asm"])
  1119 | 
  1120 |     tokens, customize = scanner.ingest(
  1121 |         co, code_objects=code_objects, show_asm=debug_opts["asm"]
  1122 |     )
  ```
  </details>

- **Static code check:** Frame `decompyle3/scanners/scanner37.py:65` in `ingest` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/scanners/scanner37.py#L65)
  <details><summary>Output</summary>

  ```
  63 |         cause specific rules for the specific number of arguments they take.
  64 |         """
  65 |         tokens, customize = Scanner37Base.ingest(
  66 |             self, bytecode, classname, code_objects, show_asm
  67 |         )
  ```
  </details>

- **Static code check:** Frame `decompyle3/scanners/scanner37base.py:672` in `ingest` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/scanners/scanner37base.py#L672)
  <details><summary>Output</summary>

  ```
  670 |                     opc=self.opc,
  671 |                     has_extended_arg=inst.has_extended_arg,
  672 |                     tos_str=inst.tos_str,
  673 |                     start_offset=inst.start_offset,
  674 |                 ),
  ```
  </details>

**What is missing:**

- None

### Claim 4: The environment uses uncompyle6 version 3.9.0 and xdis version 6.0.5.

> uncompyle6   3.9.0
> xdis         6.0.5

**Evidence:**

- No evidence recorded

**What is missing:**

- Recorded as context: environment and version details are not verified against the code.

### Claim 5: The user observed that using the git version of xdis worked, suggesting a discrepancy between the installed version and the git version.

> I had a look at circle-ci and found the difference. You are using git version of xdis. With this, it worked.

**Evidence:**

- **Static code check:** All 7 stack frames inside the repository match the code at ed375df (5 frames outside the repository were skipped), so the trace is consistent with this code path.

- **Static code check:** Frame `decompyle3/bin/decompile.py:146` in `main_bin` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/bin/decompile.py#L146)
  <details><summary>Output</summary>

  ```
  144 |         try:
  145 |             show_ast = {"before": tree or tree_plus, "after": tree_plus}
  146 |             result = main(
  147 |                 src_base,
  148 |                 out_base,
  ```
  </details>

- **Static code check:** Frame `decompyle3/main.py:337` in `main` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/main.py#L337)
  <details><summary>Output</summary>

  ```
  335 |         # Try to uncompile the input file
  336 |         try:
  337 |             deparsed_objects = decompile_file(
  338 |                 infile,
  339 |                 outstream,
  ```
  </details>

- **Static code check:** Frame `decompyle3/main.py:238` in `decompile_file` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/main.py#L238)
  <details><summary>Output</summary>

  ```
  236 |     else:
  237 |         deparsed = [
  238 |             decompile(
  239 |                 co,
  240 |                 version,
  ```
  </details>

- **Static code check:** Frame `decompyle3/main.py:158` in `decompile` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/main.py#L158)
  <details><summary>Output</summary>

  ```
  156 |             else:
  157 |                 deparse_fn = code_deparse
  158 |             deparsed = deparse_fn(
  159 |                 co,
  160 |                 out,
  ```
  </details>

- **Static code check:** Frame `decompyle3/semantics/pysource.py:1120` in `code_deparse` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/semantics/pysource.py#L1120)
  <details><summary>Output</summary>

  ```
  1118 |     scanner = get_scanner(version, is_pypy=is_pypy, show_asm=debug_opts["asm"])
  1119 | 
  1120 |     tokens, customize = scanner.ingest(
  1121 |         co, code_objects=code_objects, show_asm=debug_opts["asm"]
  1122 |     )
  ```
  </details>

- **Static code check:** Frame `decompyle3/scanners/scanner37.py:65` in `ingest` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/scanners/scanner37.py#L65)
  <details><summary>Output</summary>

  ```
  63 |         cause specific rules for the specific number of arguments they take.
  64 |         """
  65 |         tokens, customize = Scanner37Base.ingest(
  66 |             self, bytecode, classname, code_objects, show_asm
  67 |         )
  ```
  </details>

- **Static code check:** Frame `decompyle3/scanners/scanner37base.py:672` in `ingest` matches the code. [code](https://github.com/rocky/python-decompile3/blob/ed375df6b21ecbddd21cf6aaa37c7673da876751/decompyle3/scanners/scanner37base.py#L672)
  <details><summary>Output</summary>

  ```
  670 |                     opc=self.opc,
  671 |                     has_extended_arg=inst.has_extended_arg,
  672 |                     tos_str=inst.tos_str,
  673 |                     start_offset=inst.start_offset,
  674 |                 ),
  ```
  </details>

**What is missing:**

- The crash itself was not reproduced by running the reported command.

---
Generated by Pramaan at 2026-10-31T22:56:37.661Z using gemma4:e2b-it-qat. Verdicts come from code checks, not from the model.
