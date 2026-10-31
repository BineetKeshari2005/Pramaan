# Team - Black Coffee

## Problem statement
Problem 2: Triage that tests the claims
(Evidence-Based Open Source Issue and Pull Request Triage)

We are building Pramaan, a tool that checks whether the technical claims in a GitHub issue or pull request are true. It does not judge who wrote a report. It extracts each claim, verifies it against the real source code and, where possible, in an isolated sandbox, and shows maintainers the evidence. When it cannot verify a claim, it says so instead of guessing.

## Models
All models are open-weight and run locally through Ollama. No closed or cloud AI APIs are used at runtime.

| Model | Used for | Why |
|---|---|---|
| Gemma 4 e4b | Primary extraction of claims from issues and PRs as structured JSON | Small open model that runs on a laptop; the task only needs reading text and producing JSON |
| Qwen2.5-Coder 7B | Drafting a reproduction script when a report has no steps (treated as untrusted code and run only in the sandbox) | Code-tuned model, better with code and stack traces |
| Llama 3.2 3B | Independent second extraction to cross-check Gemma, and automatic fallback if Gemma fails | If two models disagree on the claims, the report is flagged for human review |
| Phi-3 mini | Last-resort fallback on low-memory machines | Very small, runs where larger models cannot |

The models only read text and draft. They never decide a verdict. All verdicts come from code: source search, sandboxed test runs, and rule-based evidence grading.

## Members
- Bineet Keshari
- Piyush Sharma
- Shourya Pratap

## AI coding assistants
Used to help write the code (not used at runtime):
- Antigravity
- Claude Code
- GitHub Copilot

