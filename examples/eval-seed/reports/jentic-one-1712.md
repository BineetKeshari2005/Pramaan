# Pramaan evidence report: jentic/jentic-one#[1712](https://github.com/jentic/jentic-one/issues/1712)

**Verified commit:** [f02936a](https://github.com/jentic/jentic-one/commit/f02936a77de5aac97478f3d7fb1be78521626cc0)

**Suggested label:** **Needs more information**
The evidence is not strong enough for a verdict; the report needs more detail.

**Best guess if a label must be chosen:** Confirmed: The report gives a trace or steps, and the code it names exists at the checked commit. _(a guess from fixed evidence rules, not a verdict)_

_Suggested label only — Pramaan never closes issues._

| # | Claim | Verdict | Confidence | Human review |
|---|---|---|---|---|
| 1 | When the upstream drops the connection mid-body on the streaming passthrough, `httpx.RemoteProtocolError` escapes from `broker/adapters/runners/http.py:268 _cap_iter` through the streaming response and is logged by the ASGI layer as `unhandled_exception` at error level without a `request_id` or `trace_id` for each affected request. | Insufficient evidence | Low | Yes |
| 2 | The client sees a truncated 200 response, while operators receive an untraceable error log with a full traceback instead of a structured `upstream_network_failure` like the buffered path emits. | Insufficient evidence | None | Yes |
| 3 | The expected behavior is to catch transport errors in the streaming body iterator, log a structured warning/error with request id, host and error type, mark the execution failed in `_persist_streaming_outcome`, and abort the response cleanly. | Insufficient evidence | None | Yes |
| 4 | The behavior described is grouped under `src/jentic_one/broker/adapters/runners/http.py:268 _cap_iter` when running `make perf-agent-resilience` (60 per 15 s run). | Reproduced | Medium | No |
| 5 | The issue is relevant to commit `253f462a0` (main as of 2026-10-16) and also applies to commit `f02936a77`. | Insufficient evidence | None | No |

### Claim 1: When the upstream drops the connection mid-body on the streaming passthrough, `httpx.RemoteProtocolError` escapes from `broker/adapters/runners/http.py:268 _cap_iter` through the streaming response and is logged by the ASGI layer as `unhandled_exception` at error level without a `request_id` or `trace_id` for each affected request.

> On the streaming passthrough, when the upstream drops the connection mid-body, `httpx.RemoteProtocolError` escapes from `broker/adapters/runners/http.py:268 _cap_iter` through the streaming response and is logged by the ASGI layer as `unhandled_exception` at error level, without `request_id` / `trace_id`, one per affected request.

**Evidence:**

- **Static code check:** File `src/jentic_one/broker/adapters/runners/http.py` exists in jentic/jentic-one at f02936a. [code](https://github.com/jentic/jentic-one/blob/f02936a77de5aac97478f3d7fb1be78521626cc0/src/jentic_one/broker/adapters/runners/http.py)

- **Static code check:** `_cap_iter` is defined in `src/jentic_one/broker/adapters/runners/http.py` line 256. [code](https://github.com/jentic/jentic-one/blob/f02936a77de5aac97478f3d7fb1be78521626cc0/src/jentic_one/broker/adapters/runners/http.py#L256)
  <details><summary>Output</summary>

  ```
  254 |         return b"".join(chunks)
  255 | 
  256 |     async def _cap_iter(
  257 |         self, source: AsyncIterator[bytes], status_code: int
  258 |     ) -> AsyncIterator[bytes]:
  259 |         """Re-yield ``source`` chunks, enforcing ``max_response_bytes`` mid-stream.
  260 | 
  ```
  </details>

- **Static code check:** Line 268 of `src/jentic_one/broker/adapters/runners/http.py` exists; the code there is shown below. [code](https://github.com/jentic/jentic-one/blob/f02936a77de5aac97478f3d7fb1be78521626cc0/src/jentic_one/broker/adapters/runners/http.py#L268)
  <details><summary>Output</summary>

  ```
  265 |         """
  266 |         cap = self._max_response_bytes
  267 |         total = 0
  268 |         async for chunk in source:
  269 |             total += len(chunk)
  270 |             if cap and total > cap:
  271 |                 raise UpstreamResponseTooLargeError(
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

### Claim 2: The client sees a truncated 200 response, while operators receive an untraceable error log with a full traceback instead of a structured `upstream_network_failure` like the buffered path emits.

> The client sees a truncated 200 (expected for streaming), but operators get an untraceable error log with a full traceback instead of a structured `upstream_network_failure` like the buffered path emits.

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 3: The expected behavior is to catch transport errors in the streaming body iterator, log a structured warning/error with request id, host and error type, mark the execution failed in `_persist_streaming_outcome`, and abort the response cleanly.

> Expected: catch transport errors in the streaming body iterator, log a structured warning/error with request id, host and error type, mark the execution failed in `_persist_streaming_outcome`, and abort the response cleanly.

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 4: The behavior described is grouped under `src/jentic_one/broker/adapters/runners/http.py:268 _cap_iter` when running `make perf-agent-resilience` (60 per 15 s run).

> `make perf-agent-resilience` groups these under `src/jentic_one/broker/adapters/runners/http.py:268 _cap_iter` (60 per 15 s run).

**Evidence:**

- **Static code check:** File `src/jentic_one/broker/adapters/runners/http.py` exists in jentic/jentic-one at f02936a. [code](https://github.com/jentic/jentic-one/blob/f02936a77de5aac97478f3d7fb1be78521626cc0/src/jentic_one/broker/adapters/runners/http.py)

- **Static code check:** `_cap_iter` is defined in `src/jentic_one/broker/adapters/runners/http.py` line 256. [code](https://github.com/jentic/jentic-one/blob/f02936a77de5aac97478f3d7fb1be78521626cc0/src/jentic_one/broker/adapters/runners/http.py#L256)
  <details><summary>Output</summary>

  ```
  254 |         return b"".join(chunks)
  255 | 
  256 |     async def _cap_iter(
  257 |         self, source: AsyncIterator[bytes], status_code: int
  258 |     ) -> AsyncIterator[bytes]:
  259 |         """Re-yield ``source`` chunks, enforcing ``max_response_bytes`` mid-stream.
  260 | 
  ```
  </details>

- **Static code check:** Line 268 of `src/jentic_one/broker/adapters/runners/http.py` exists; the code there is shown below. [code](https://github.com/jentic/jentic-one/blob/f02936a77de5aac97478f3d7fb1be78521626cc0/src/jentic_one/broker/adapters/runners/http.py#L268)
  <details><summary>Output</summary>

  ```
  265 |         """
  266 |         cap = self._max_response_bytes
  267 |         total = 0
  268 |         async for chunk in source:
  269 |             total += len(chunk)
  270 |             if cap and total > cap:
  271 |                 raise UpstreamResponseTooLargeError(
  ```
  </details>

**What is missing:**

- None

### Claim 5: The issue is relevant to commit `253f462a0` (main as of 2026-10-16) and also applies to commit `f02936a77`.

> Commit: `253f462a0` (main as of 2026-10-16; still applies to `f02936a77`)

**Evidence:**

- No evidence recorded

**What is missing:**

- Recorded as context: environment and version details are not verified against the code.

---
Generated by Pramaan at 2026-10-31T20:43:02.170Z using gemma4:e2b-it-qat. Verdicts come from code checks, not from the model.
