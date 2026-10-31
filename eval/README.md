# Labelled Evaluation Dataset of Closed GitHub Issues

This directory contains the reference evaluation dataset for Pramaan (`eval/dataset.json`), the validation schema (`eval/schema.ts`), and the offline and online verification suites.

Pramaan checks whether technical claims in a GitHub issue are true and suggests a triage label (`confirmed`, `invalid`, `cannot-reproduce`, `needs-info`, or `needs-human-review`). This dataset collects real, previously closed public issues where maintainers reached definitive conclusions, providing ground truth reference answers for evaluation.

---

## Dataset Overview

- **Total cases:** 27
- **Schema version:** 1
- **Created at:** 2026-11-01

### Distribution by Reference Label

| Reference Label | Count | Primary GitHub Source Labels |
|---|---|---|
| `invalid` | 9 | `invalid`, `Not a bug` |
| `cannot-reproduce` | 9 | `cannot reproduce`, `can't reproduce`, `works for me`, `Can't reproduce`, `unable to reproduce` |
| `confirmed` | 9 | `confirmed` |
| **Total** | **27** | |

### Distribution by Programming Language

| Language | Count | Percentage |
|---|---|---|
| Python | 14 | 51.9% |
| JavaScript | 7 | 25.9% |
| Go | 2 | 7.4% |
| Java | 1 | 3.7% |
| Ruby | 1 | 3.7% |
| TypeScript | 1 | 3.7% |
| **Total** | **27** | **100%** |

- **Python + JavaScript/TypeScript:** 22 cases (81.5%, requirement: $\ge 18$)
- **Cases with stack traces:** 8 cases (29.6%, requirement: $\ge 8$)
- **Security-related cases:** 5 cases (18.5%, requirement: $\ge 3$)
- **Max cases per repository:** 2 cases (requirement: $\le 3$)

---

## How the Dataset Was Built

1. **Candidate Discovery:** We queried the GitHub Search and REST APIs across small and medium repositories for issues closed in 2022 or later that carried explicit triage and resolution labels.
2. **Issue Inspection:** Each candidate issue thread was inspected in full (issue description, code blocks, stack traces, reproduction instructions, maintainer discussion, and closing events).
3. **Ground Truth Validation:** Every issue retained in the dataset has a clear, checkable closing rationale confirmed by maintainer comments or merged fixes recorded in `closingEvidence`.
4. **Live API Verification:** Every entry was checked live against the GitHub API via `eval/verify-dataset.ts` to confirm that the issue exists, is closed, bears the exact `sourceLabel`, and has a matching `closedAt` timestamp.

---

## Label Mapping

The evaluation maps maintainer issue labels to Pramaan's reference labels as follows:

- **`invalid`**:
  - Mapped from `invalid` and `Not a bug` (e.g. user configuration errors, wrong versions, antivirus false positives, or invalid packaging).
  - Examples: `sqlmap-6154` (outdated code on disk), `bc-java-2497` (reported CVE already fixed in reported version), `js-abbreviation-number-39` (misconfigured symbol array).
- **`cannot-reproduce`**:
  - Mapped from `cannot reproduce`, `can't reproduce`, `works for me`, `Can't reproduce`, `unable to reproduce` where maintainers attempted reproduction and closed the issue due to lack of reproducibility.
  - Examples: `moritzgloeckl/overleaf-sync#54`, `rocky/python-decompile3#158`, `neoclide/coc.nvim#5703`, `uBlockOrigin/uBlock-issues#4183`.
- **`confirmed`**:
  - Mapped from `confirmed` where maintainers reproduced the bug, acknowledged the defect, or merged a resolving patch.
  - Examples: `tiangolo/fastapi#12313`, `anacrolix/torrent#795`, `memroot/plugins#1`, `mailcow/mailcow-dockerized#6747`.

---

## Selection Rules

To ensure realistic, high-quality, and computationally feasible automated analysis:
1. **Repository Size:** Small and medium repositories (mostly $< 50\text{ MB}$; avoiding multi-gigabyte monorepos like Chromium, Linux, or Kubernetes) so that automated checkouts and static indexing complete within reasonable time limits.
2. **Concrete Technical Claims:** Every issue body makes concrete technical statements naming specific files, functions, error types, versions, or CLI flags rather than vague feature suggestions.
3. **Diversity:** At most 3 cases per repository (here at most 2) across 17 distinct open-source projects.
4. **Temporal Scope:** All issues were closed in 2022 or later.
5. **Privacy:** All issues are public open-source threads with no proprietary or private user data.

---

## Known Biases and Limitations

Users and evaluators should keep the following biases in mind:

1. **Resolution Clarity Bias:** Closed issues with explicit labels like `cannot reproduce` or `invalid` represent cases where maintainers were decisive. Real-world open triage queues are substantially noisier and often contain ambiguous issues waiting for information (`needs-info`).
2. **Repository Size Bias:** By deliberately selecting small-to-medium repositories for benchmarking speed, the dataset under-represents massive multi-package monorepos where claim resolution may span deep dependency graphs.
3. **Language Skew:** To match Pramaan's current static analysis capabilities, the dataset is heavily weighted toward Python and JavaScript/TypeScript (~81.5%), with smaller representation for Go, Java, and Ruby.
4. **Surviving Evidence Bias:** Closed confirmed issues often have concise bug descriptions written by experienced reporters because maintainers quickly prioritize well-documented bugs.
