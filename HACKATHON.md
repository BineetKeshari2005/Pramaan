# Team - Black Coffee

## Problem statement
Problem 2: Triage that tests the claims
(Evidence-Based Open Source Issue and Pull Request Triage)

We are building Pramaan, a tool that checks whether the technical claims in a GitHub issue or pull request are true. It does not judge who wrote a report. It extracts each claim, verifies it against the real source code and, where possible, in an isolated sandbox, and shows maintainers the evidence. When it cannot verify a claim, it says so instead of guessing.

## Models
The model is open-weight and runs locally through Ollama. No closed or cloud AI APIs are used at runtime. This table lists only models our code actually calls.

| Model | Used for | Why |
|---|---|---|
| Gemma 4 E2B, QAT 4-bit (`gemma4:e2b-it-qat`, Ollama 0.40+) | Extracting atomic technical claims from issue and PR text as schema-constrained JSON (`src/core/claims`) | The task is reading text and producing structured JSON, which a small model handles. At 4.3 GB it runs on an 8 GB laptop next to the rest of the stack, where Gemma 4 E4B (~9.5 GB) does not. Quantization-aware training keeps quality close to full precision. Thinking mode is on by default because it roughly triples the number of claims found; `PRAMAAN_EXTRACT_THINK=false` trades that for about 6x lower latency. |

Any Ollama model can be swapped in with `PRAMAAN_EXTRACT_MODEL` (for example `gemma4:e4b` on a 16 GB machine).

The model only reads text. It never decides a verdict. Every claim it returns must quote the report word for word, or it is dropped. All verdicts come from code: file, symbol and line checks against the repository at the right commit, stack-trace matching, and rule-based evidence grading.

## Members
- Bineet Keshari
- Piyush Sharma
- Shourya Pratap

## AI coding assistants
Used to help write the code (not used at runtime):
- Antigravity
- Claude Code
- GitHub Copilot

