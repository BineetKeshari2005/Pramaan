# Pramaan evaluation results

Dataset: `examples/eval-seed/dataset.json` · 9 closed issues · models: gemma4:e2b-it-qat · generated 2026-10-31T20:44:20.665Z

Reference answers are the labels maintainers gave the issues when closing them. Pramaan never saw those labels.

## Headline

| Metric | Value |
|---|---|
| Answered (gave invalid / cannot-reproduce / confirmed) | 0 of 9 (0%) |
| Abstained (needs-info / needs-human-review) | 9 (100%) |
| Errors (could not run) | 0 |
| Accuracy when it answered | n/a |
| Accuracy over all cases (abstain = wrong) | 0% |
| Macro F1 over the three labels | 0.00 |
| **Real bugs dismissed as invalid** | **0** |
| Invalid reports labelled confirmed | 0 |

## Per label

| Reference label | Cases | Predicted as this | Correct | Precision | Recall |
|---|---|---|---|---|---|
| invalid | 3 | 0 | 0 | n/a | 0% |
| cannot-reproduce | 3 | 0 | 0 | n/a | 0% |
| confirmed | 3 | 0 | 0 | n/a | 0% |

## Confusion matrix

Rows: maintainers' label. Columns: Pramaan's suggested label.

| | confirmed | invalid | cannot-reproduce | needs-info | needs-human-review | error |
|---|---|---|---|---|---|---|
| **invalid** | 0 | 0 | 0 | 3 | 0 | 0 |
| **cannot-reproduce** | 0 | 0 | 0 | 2 | 1 | 0 |
| **confirmed** | 0 | 0 | 0 | 3 | 0 | 0 |

## Every case

| Case | Maintainers | Pramaan | Time | Report |
|---|---|---|---|---|
| [sqlmap-6154](https://github.com/sqlmapproject/sqlmap/issues/6154) | invalid | ➖ needs-info | 56s | [json](reports/sqlmap-6154.json) · [md](reports/sqlmap-6154.md) |
| [js-abbreviation-number-39](https://github.com/moh3n9595/js-abbreviation-number/issues/39) | invalid | ➖ needs-info | 25s | [json](reports/js-abbreviation-number-39.json) · [md](reports/js-abbreviation-number-39.md) |
| [nebra-157](https://github.com/nebra-lang/nebra/issues/157) | invalid | ➖ needs-info | 25s | [json](reports/nebra-157.json) · [md](reports/nebra-157.md) |
| [exabgp-955](https://github.com/Exa-Networks/exabgp/issues/955) | cannot-reproduce | ➖ needs-info | 35s | [json](reports/exabgp-955.json) · [md](reports/exabgp-955.md) |
| [hass-oidc-auth-334](https://github.com/christiaangoossens/hass-oidc-auth/issues/334) | cannot-reproduce | ➖ needs-info | 52s | [json](reports/hass-oidc-auth-334.json) · [md](reports/hass-oidc-auth-334.md) |
| [gopro-dashboard-overlay-241](https://github.com/time4tea/gopro-dashboard-overlay/issues/241) | cannot-reproduce | ➖ needs-human-review | 53s | [json](reports/gopro-dashboard-overlay-241.json) · [md](reports/gopro-dashboard-overlay-241.md) |
| [jentic-one-1712](https://github.com/jentic/jentic-one/issues/1712) | confirmed | ➖ needs-info | 59s | [json](reports/jentic-one-1712.json) · [md](reports/jentic-one-1712.md) |
| [kalinkaplayer-159](https://github.com/Kalinka-Player/KalinkaPlayer/issues/159) | confirmed | ➖ needs-info | 40s | [json](reports/kalinkaplayer-159.json) · [md](reports/kalinkaplayer-159.md) |
| [memanga-234](https://github.com/meellm/MeManga/issues/234) | confirmed | ➖ needs-info | 38s | [json](reports/memanga-234.json) · [md](reports/memanga-234.md) |

✅ matches the maintainers · ➖ abstained (asked for more information or a human) · ❌ wrong label · ⚠️ could not run
