# Pramaan evidence report: tiangolo/fastapi#[10321](https://github.com/tiangolo/fastapi/issues/10321)

**Verified commit:** [69a7c99](https://github.com/tiangolo/fastapi/commit/69a7c99b447c9ef103dc03e93d172cabd99ac832)

**Suggested label:** **Needs more information**
The evidence is not strong enough for a verdict; the report needs more detail.

**Best guess if a label must be chosen:** Confirmed: The report gives a trace or steps, and the code it names exists at the checked commit. _(a guess from fixed evidence rules, not a verdict)_

_Suggested label only — Pramaan never closes issues._

| # | Claim | Verdict | Confidence | Human review |
|---|---|---|---|---|
| 1 | When using Pydantic 2 with the example code, FastAPI fails to generate openapi.json. | Insufficient evidence | Low | Yes |

### Claim 1: When using Pydantic 2 with the example code, FastAPI fails to generate openapi.json.

> When using Pydantic 2 with the example code, FastAPI fails to generate openapi.json.

**Evidence:**

- **Static code check:** All 7 stack frames inside the repository match the code at 69a7c99 (15 frames outside the repository were skipped), so the trace is consistent with this code path.

- **Static code check:** Frame `fastapi/applications.py:289` in `__call__` matches the code. [code](https://github.com/tiangolo/fastapi/blob/69a7c99b447c9ef103dc03e93d172cabd99ac832/fastapi/applications.py#L289)
  <details><summary>Output</summary>

  ```
  287 |             self.add_route(self.redoc_url, redoc_html, include_in_schema=False)
  288 | 
  289 |     async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
  290 |         if self.root_path:
  291 |             scope["root_path"] = self.root_path
  ```
  </details>

- **Static code check:** Frame `fastapi/middleware/asyncexitstack.py:20` in `__call__` matches the code. [code](https://github.com/tiangolo/fastapi/blob/69a7c99b447c9ef103dc03e93d172cabd99ac832/fastapi/middleware/asyncexitstack.py#L20)
  <details><summary>Output</summary>

  ```
  18 |             except Exception as e:
  19 |                 dependency_exception = e
  20 |                 raise e
  21 |         if dependency_exception:
  22 |             # This exception was possibly handled by the dependency but it should
  ```
  </details>

- **Static code check:** Frame `fastapi/middleware/asyncexitstack.py:17` in `__call__` matches the code. [code](https://github.com/tiangolo/fastapi/blob/69a7c99b447c9ef103dc03e93d172cabd99ac832/fastapi/middleware/asyncexitstack.py#L17)
  <details><summary>Output</summary>

  ```
  15 |             scope[self.context_name] = stack
  16 |             try:
  17 |                 await self.app(scope, receive, send)
  18 |             except Exception as e:
  19 |                 dependency_exception = e
  ```
  </details>

- **Static code check:** Frame `fastapi/applications.py:244` in `openapi` matches the code. [code](https://github.com/tiangolo/fastapi/blob/69a7c99b447c9ef103dc03e93d172cabd99ac832/fastapi/applications.py#L244)
  <details><summary>Output</summary>

  ```
  242 |                 root_path = req.scope.get("root_path", "").rstrip("/")
  243 |                 if root_path not in server_urls:
  244 |                     if root_path and self.root_path_in_servers:
  245 |                         self.servers.insert(0, {"url": root_path})
  246 |                         server_urls.add(root_path)
  ```
  </details>

- **Static code check:** Frame `fastapi/applications.py:217` in `openapi` matches the code. [code](https://github.com/tiangolo/fastapi/blob/69a7c99b447c9ef103dc03e93d172cabd99ac832/fastapi/applications.py#L217)
  <details><summary>Output</summary>

  ```
  215 |         return app
  216 | 
  217 |     def openapi(self) -> Dict[str, Any]:
  218 |         if not self.openapi_schema:
  219 |             self.openapi_schema = get_openapi(
  ```
  </details>

- **Static code check:** Frame `fastapi/openapi/utils.py:458` in `get_openapi` matches the code. [code](https://github.com/tiangolo/fastapi/blob/69a7c99b447c9ef103dc03e93d172cabd99ac832/fastapi/openapi/utils.py#L458)
  <details><summary>Output</summary>

  ```
  456 |         info["summary"] = summary
  457 |     if description:
  458 |         info["description"] = description
  459 |     if terms_of_service:
  460 |         info["termsOfService"] = terms_of_service
  ```
  </details>

- **Static code check:** Frame `fastapi/_compat.py:213` in `get_definitions` matches the code. [code](https://github.com/tiangolo/fastapi/blob/69a7c99b447c9ef103dc03e93d172cabd99ac832/fastapi/_compat.py#L213)
  <details><summary>Output</summary>

  ```
  211 |         ],
  212 |         Dict[str, Dict[str, Any]],
  213 |     ]:
  214 |         override_mode: Union[Literal["validation"], None] = (
  215 |             None if separate_input_output_schemas else "validation"
  ```
  </details>

**What is missing:**

- The crash itself was not reproduced by running the reported command.

- The report includes a Python snippet, but the Docker sandbox is not running, so it was not executed.

---
Generated by Pramaan at 2026-10-31T21:20:59.874Z using gemma4:e2b-it-qat. Verdicts come from code checks, not from the model.
