# Pramaan evaluation results

Dataset: `eval/dataset.json` · 27 closed issues · models: gemma4:e2b-it-qat · generated 2026-10-31T21:26:38.030Z

Reference answers are the labels maintainers gave the issues when closing them. Pramaan never saw those labels.

Pramaan reports two labels. The **committed label** is given only when code checks settle it (code that does not exist, or a reproduction that ran); otherwise it abstains with needs-info or needs-human-review. The **best guess** is the closest label when forced to choose, from fixed evidence rules, and is shown to maintainers as a guess.

## Committed label

| Metric | Value |
|---|---|
| Answered (gave invalid / cannot-reproduce / confirmed) | 8 of 27 (30%) |
| Abstained (needs-info / needs-human-review) | 19 (70%) |
| Errors (could not run) | 0 |
| Accuracy when it answered | 25% |
| Accuracy over all cases (abstain = wrong) | 7% |
| Macro F1 over the three labels | 0.08 |
| **Real bugs dismissed as invalid** | **0** |
| Invalid reports labelled confirmed | 0 |

| Reference label | Cases | Predicted as this | Correct | Precision | Recall |
|---|---|---|---|---|---|
| invalid | 9 | 8 | 2 | 25% | 22% |
| cannot-reproduce | 9 | 0 | 0 | n/a | 0% |
| confirmed | 9 | 0 | 0 | n/a | 0% |

Rows: maintainers' label. Columns: Pramaan's committed label.

| | confirmed | invalid | cannot-reproduce | needs-info | needs-human-review | error |
|---|---|---|---|---|---|---|
| **invalid** | 0 | 2 | 0 | 6 | 1 | 0 |
| **cannot-reproduce** | 0 | 6 | 0 | 3 | 0 | 0 |
| **confirmed** | 0 | 0 | 0 | 9 | 0 | 0 |

## Best guess (forced to choose)

| Metric | Value |
|---|---|
| Accuracy over all cases | 41% (11 of 27) |
| Baseline: always answer "invalid" | 33% |
| Macro F1 over the three labels | 0.40 |
| **Real bugs dismissed as invalid** | **1** |
| Invalid reports labelled confirmed | 3 |

| Reference label | Cases | Predicted as this | Correct | Precision | Recall |
|---|---|---|---|---|---|
| invalid | 9 | 12 | 5 | 42% | 56% |
| cannot-reproduce | 9 | 9 | 3 | 33% | 33% |
| confirmed | 9 | 6 | 3 | 50% | 33% |

Rows: maintainers' label. Columns: Pramaan's best guess.

| | confirmed | invalid | cannot-reproduce | error |
|---|---|---|---|---|
| **invalid** | 3 | 5 | 1 | 0 |
| **cannot-reproduce** | 0 | 6 | 3 | 0 |
| **confirmed** | 3 | 1 | 5 | 0 |

## Every case

| Case | Maintainers | Committed | Best guess | Why (best guess) | Time | Report |
|---|---|---|---|---|---|---|
| [sqlmap-6154](https://github.com/sqlmapproject/sqlmap/issues/6154) | invalid | ➖ needs-info | ❌ confirmed | The report gives a trace or steps, and the code it names exists at the checked commit. | 59s | [json](reports/sqlmap-6154.json) · [md](reports/sqlmap-6154.md) |
| [sqlmap-6135](https://github.com/sqlmapproject/sqlmap/issues/6135) | invalid | ➖ needs-info | ❌ confirmed | The report gives a trace or steps, and the code it names exists at the checked commit. | 46s | [json](reports/sqlmap-6135.json) · [md](reports/sqlmap-6135.md) |
| [bc-java-2497](https://github.com/bcgit/bc-java/issues/2497) | invalid | ➖ needs-human-review | ✅ invalid | The report has no checkable technical detail: no code references, steps, logs or traces. | 63s | [json](reports/bc-java-2497.json) · [md](reports/bc-java-2497.md) |
| [js-abbreviation-number-39](https://github.com/moh3n9595/js-abbreviation-number/issues/39) | invalid | ➖ needs-info | ❌ confirmed | The report gives a trace or steps, and the code it names exists at the checked commit. | 25s | [json](reports/js-abbreviation-number-39.json) · [md](reports/js-abbreviation-number-39.md) |
| [click-3732](https://github.com/pallets/click/issues/3732) | invalid | ➖ needs-info | ✅ invalid | The report has no checkable technical detail: no code references, steps, logs or traces. | 39s | [json](reports/click-3732.json) · [md](reports/click-3732.md) |
| [printrun-1393](https://github.com/kliment/Printrun/issues/1393) | invalid | ✅ invalid | ✅ invalid | Same as the committed label. | 171s | [json](reports/printrun-1393.json) · [md](reports/printrun-1393.md) |
| [scrapling-524](https://github.com/D4Vinci/Scrapling/issues/524) | invalid | ➖ needs-info | ❌ cannot-reproduce | The claims could not be checked and the report gives no trace or steps to reproduce. | 70s | [json](reports/scrapling-524.json) · [md](reports/scrapling-524.md) |
| [scrapling-428](https://github.com/D4Vinci/Scrapling/issues/428) | invalid | ➖ needs-info | ✅ invalid | The report has no checkable technical detail: no code references, steps, logs or traces. | 13s | [json](reports/scrapling-428.json) · [md](reports/scrapling-428.md) |
| [sinatra-2143](https://github.com/sinatra/sinatra/issues/2143) | invalid | ✅ invalid | ✅ invalid | Same as the committed label. | 30s | [json](reports/sinatra-2143.json) · [md](reports/sinatra-2143.md) |
| [overleaf-sync-54](https://github.com/moritzgloeckl/overleaf-sync/issues/54) | cannot-reproduce | ❌ invalid | ❌ invalid | Same as the committed label. | 36s | [json](reports/overleaf-sync-54.json) · [md](reports/overleaf-sync-54.md) |
| [overleaf-sync-50](https://github.com/moritzgloeckl/overleaf-sync/issues/50) | cannot-reproduce | ➖ needs-info | ✅ cannot-reproduce | The claims could not be checked and the report gives no trace or steps to reproduce. | 26s | [json](reports/overleaf-sync-50.json) · [md](reports/overleaf-sync-50.md) |
| [tailscale-gnome-qs-67](https://github.com/tailscale-qs/tailscale-gnome-qs/issues/67) | cannot-reproduce | ❌ invalid | ❌ invalid | Same as the committed label. | 51s | [json](reports/tailscale-gnome-qs-67.json) · [md](reports/tailscale-gnome-qs-67.md) |
| [tailscale-gnome-qs-59](https://github.com/tailscale-qs/tailscale-gnome-qs/issues/59) | cannot-reproduce | ➖ needs-info | ✅ cannot-reproduce | The claims could not be checked and the report gives no trace or steps to reproduce. | 32s | [json](reports/tailscale-gnome-qs-59.json) · [md](reports/tailscale-gnome-qs-59.md) |
| [python-decompile3-158](https://github.com/rocky/python-decompile3/issues/158) | cannot-reproduce | ❌ invalid | ❌ invalid | Same as the committed label. | 61s | [json](reports/python-decompile3-158.json) · [md](reports/python-decompile3-158.md) |
| [python-decompile3-120](https://github.com/rocky/python-decompile3/issues/120) | cannot-reproduce | ❌ invalid | ❌ invalid | Same as the committed label. | 78s | [json](reports/python-decompile3-120.json) · [md](reports/python-decompile3-120.md) |
| [printrun-1444](https://github.com/kliment/Printrun/issues/1444) | cannot-reproduce | ➖ needs-info | ✅ cannot-reproduce | The claims could not be checked and the report gives no trace or steps to reproduce. | 27s | [json](reports/printrun-1444.json) · [md](reports/printrun-1444.md) |
| [coc-nvim-5703](https://github.com/neoclide/coc.nvim/issues/5703) | cannot-reproduce | ❌ invalid | ❌ invalid | Same as the committed label. | 41s | [json](reports/coc-nvim-5703.json) · [md](reports/coc-nvim-5703.md) |
| [ublock-issues-4183](https://github.com/uBlockOrigin/uBlock-issues/issues/4183) | cannot-reproduce | ❌ invalid | ❌ invalid | Same as the committed label. | 34s | [json](reports/ublock-issues-4183.json) · [md](reports/ublock-issues-4183.md) |
| [fastapi-12313](https://github.com/tiangolo/fastapi/issues/12313) | confirmed | ➖ needs-info | ✅ confirmed | The report gives a trace or steps, and the code it names exists at the checked commit. | 47s | [json](reports/fastapi-12313.json) · [md](reports/fastapi-12313.md) |
| [fastapi-10321](https://github.com/tiangolo/fastapi/issues/10321) | confirmed | ➖ needs-info | ✅ confirmed | The report gives a trace or steps, and the code it names exists at the checked commit. | 33s | [json](reports/fastapi-10321.json) · [md](reports/fastapi-10321.md) |
| [flaresolverr-1741](https://github.com/FlareSolverr/FlareSolverr/issues/1741) | confirmed | ➖ needs-info | ❌ cannot-reproduce | The claims could not be checked and the report gives no trace or steps to reproduce. | 47s | [json](reports/flaresolverr-1741.json) · [md](reports/flaresolverr-1741.md) |
| [flaresolverr-1534](https://github.com/FlareSolverr/FlareSolverr/issues/1534) | confirmed | ➖ needs-info | ❌ cannot-reproduce | The claims could not be checked and the report gives no trace or steps to reproduce. | 25s | [json](reports/flaresolverr-1534.json) · [md](reports/flaresolverr-1534.md) |
| [torrent-889](https://github.com/anacrolix/torrent/issues/889) | confirmed | ➖ needs-info | ❌ cannot-reproduce | The claims could not be checked and the report gives no trace or steps to reproduce. | 33s | [json](reports/torrent-889.json) · [md](reports/torrent-889.md) |
| [torrent-795](https://github.com/anacrolix/torrent/issues/795) | confirmed | ➖ needs-info | ✅ confirmed | The report gives a trace or steps, and the code it names exists at the checked commit. | 58s | [json](reports/torrent-795.json) · [md](reports/torrent-795.md) |
| [plugins-2](https://github.com/memroot/plugins/issues/2) | confirmed | ➖ needs-info | ❌ invalid | The report has no checkable technical detail: no code references, steps, logs or traces. | 54s | [json](reports/plugins-2.json) · [md](reports/plugins-2.md) |
| [plugins-1](https://github.com/memroot/plugins/issues/1) | confirmed | ➖ needs-info | ❌ cannot-reproduce | The claims could not be checked and the report gives no trace or steps to reproduce. | 72s | [json](reports/plugins-1.json) · [md](reports/plugins-1.md) |
| [mailcow-dockerized-6747](https://github.com/mailcow/mailcow-dockerized/issues/6747) | confirmed | ➖ needs-info | ❌ cannot-reproduce | The claims could not be checked and the report gives no trace or steps to reproduce. | 49s | [json](reports/mailcow-dockerized-6747.json) · [md](reports/mailcow-dockerized-6747.md) |

✅ matches the maintainers · ➖ abstained (asked for more information or a human) · ❌ wrong label · ⚠️ could not run
