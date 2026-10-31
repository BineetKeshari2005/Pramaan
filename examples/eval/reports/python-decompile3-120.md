# Pramaan evidence report: rocky/python-decompile3#[120](https://github.com/rocky/python-decompile3/issues/120)

**Verified commit:** [7e555cd](https://github.com/rocky/python-decompile3/commit/7e555cd2bf37b05b01c27a44acd6c72c99112036)

**Suggested label:** **Needs more information**
The evidence is not strong enough for a verdict; the report needs more detail.

**Best guess if a label must be chosen:** Could not reproduce: The claims could not be checked and the report gives no trace or steps to reproduce. _(a guess from fixed evidence rules, not a verdict)_

_Suggested label only — Pramaan never closes issues._

| # | Claim | Verdict | Confidence | Human review |
|---|---|---|---|---|
| 1 | Decompilation failed with the error message 'Deparsing stopped due to parse error'. | Insufficient evidence | None | Yes |
| 2 | The expected behavior is that the decompiler can create a compilable source file. | Insufficient evidence | None | Yes |
| 3 | The decompiler version used was 3.9.0. | Insufficient evidence | None | No |
| 4 | The Python bytecode version base was 3.8.0 (3413). | Insufficient evidence | None | No |
| 5 | The code was decompiled from Python 3.8.10. | Insufficient evidence | None | No |
| 6 | Running `decompyle3 atw.pyc` with the pyc file attached results in 'Deparsing stopped due to parse error'. | Insufficient evidence | None | Yes |
| 7 | The decompiler output includes the following instruction context: L. 29 28 POP_EXCEPT -&gt; 30 LOAD_CONST None 32 RETURN_VALUE 34_0 COME_FROM 20 '20'. | Insufficient evidence | None | Yes |
| 8 | Using Python 3.9.1.dev0 on Windows 10 with Python 3.8.10 still results in the same error. | Insufficient evidence | None | Yes |
| 9 | Running the decompilation process on Ubuntu 22.04.1 LTS still results in the same error. | Insufficient evidence | None | Yes |
| 10 | Using uncompyle6 and decompyle3 resulted in the same error. | Insufficient evidence | None | Yes |
| 11 | A common error occurs for original Python code that uses a specific decorator pattern. | Insufficient evidence | None | Yes |

### Claim 1: Decompilation failed with the error message 'Deparsing stopped due to parse error'.

> Decompiled failed with `Deparsing stopped due to parse error`, with the pyc file attached

**Evidence:**

- **Text only:** `atw.pyc` is not in the repository; it may be the reporter's own file.

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

### Claim 2: The expected behavior is that the decompiler can create a compilable source file.

> The decompiler can create a c ompileable source file.

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 3: The decompiler version used was 3.9.0.

> decompyle3 version 3.9.0

**Evidence:**

- No evidence recorded

**What is missing:**

- Recorded as context: environment and version details are not verified against the code.

### Claim 4: The Python bytecode version base was 3.8.0 (3413).

> Python bytecode version base 3.8.0 (3413)

**Evidence:**

- No evidence recorded

**What is missing:**

- Recorded as context: environment and version details are not verified against the code.

### Claim 5: The code was decompiled from Python 3.8.10.

> Decompiled from: Python 3.8.10 (tags/v3.8.10:3d8993a, May  3 2021, 11:48:03) [MSC v.1928 64 bit (AMD64)]

**Evidence:**

- No evidence recorded

**What is missing:**

- Recorded as context: environment and version details are not verified against the code.

### Claim 6: Running `decompyle3 atw.pyc` with the pyc file attached results in 'Deparsing stopped due to parse error'.

> decompyle3 atw.pyc &gt; F:\GitRepo\local\atw.py
> \# file atw.pyc
> \# Deparsing stopped due to parse error

**Evidence:**

- **Text only:** `atw.pyc` is not in the repository; it may be the reporter's own file.

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

### Claim 7: The decompiler output includes the following instruction context: L. 29 28 POP_EXCEPT -&gt; 30 LOAD_CONST None 32 RETURN_VALUE 34_0 COME_FROM 20 '20'.

> Instruction context:
>    L.  29        28  POP_EXCEPT       
> -&gt;                30  LOAD_CONST               None
>                   32  RETURN_VALUE       
>                 34_0  COME_FROM            20  '20'

**Evidence:**

- **Text only:** `atw.pyc` is not in the repository; it may be the reporter's own file.

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

### Claim 8: Using Python 3.9.1.dev0 on Windows 10 with Python 3.8.10 still results in the same error.

> I tried to use 3.9.1.dev0 in Windows 10, with Python 3.8.10 but still the same error:

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 9: Running the decompilation process on Ubuntu 22.04.1 LTS still results in the same error.

> I tried to run in Ubuntu 22.04.1 LTS, still the same error @rocky

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 10: Using uncompyle6 and decompyle3 resulted in the same error.

> I haved tested this with uncompyle6 and decompyle3. The same error occurred.

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 11: A common error occurs for original Python code that uses a specific decorator pattern.

> I think this is a common error, for all original python code that uses this pattern:
> 
> def a_decorator(func):
>     def wrapper(*args, **kwargs):
>         """A wrapper function"""
>         # Extend some capabilities of func
>         func()
>     return wrapper
>  
> @a_decorator
> def first_function():
>     """This is docstring for first function"""
>     print("first function")

**Evidence:**

- **Text only:** `a_decorator` does not appear in rocky/python-decompile3 at 7e555cd; it may come from the reporter's own code or a dependency.

- **Text only:** `first_function` does not appear in rocky/python-decompile3 at 7e555cd; it may come from the reporter's own code or a dependency.

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

---
Generated by Pramaan at 2026-10-31T22:56:39.950Z using gemma4:e2b-it-qat. Verdicts come from code checks, not from the model.
