# Pramaan evidence report: anacrolix/torrent#[795](https://github.com/anacrolix/torrent/issues/795)

**Verified commit:** [48ad1a8](https://github.com/anacrolix/torrent/commit/48ad1a8aca56922aca5d15632c58894985a71a69)

**Suggested label:** **Needs more information**
The evidence is not strong enough for a verdict; the report needs more detail.

**Best guess if a label must be chosen:** Confirmed: The report gives a trace or steps, and the code it names exists at the checked commit. _(a guess from fixed evidence rules, not a verdict)_

_Suggested label only — Pramaan never closes issues._

| # | Claim | Verdict | Confidence | Human review |
|---|---|---|---|---|
| 1 | Calling request-strategy.(*PieceRequestOrder).Update causes a runtime error: invalid memory address or nil pointer dereference. | Insufficient evidence | Low | No |
| 2 | The crash occurs in version v1.47.0. | Insufficient evidence | Low | No |
| 3 | The crash also occurs in version v1.48.0 when using qBittorrent/4.5.0. | Insufficient evidence | Low | No |
| 4 | Attempting to update to version v1.48.0 fails with an invalid version error. | Insufficient evidence | None | No |

### Claim 1: Calling request-strategy.(*PieceRequestOrder).Update causes a runtime error: invalid memory address or nil pointer dereference.

> panic: runtime error: invalid memory address or nil pointer dereference

**Evidence:**

- **Static code check:** File `request-strategy/piece-request-order.go` exists in anacrolix/torrent at 48ad1a8. [code](https://github.com/anacrolix/torrent/blob/48ad1a8aca56922aca5d15632c58894985a71a69/request-strategy/piece-request-order.go)

- **Static code check:** `Update` is defined in `request-strategy/piece-request-order.go` line 51. [code](https://github.com/anacrolix/torrent/blob/48ad1a8aca56922aca5d15632c58894985a71a69/request-strategy/piece-request-order.go#L51)
  <details><summary>Output</summary>

  ```
  49 | }
  50 | 
  51 | func (me *PieceRequestOrder) Update(
  52 | 	key PieceRequestOrderKey,
  53 | 	state PieceRequestOrderState,
  54 | ) {
  55 | 	oldState, ok := me.keys[key]
  ```
  </details>

- **Static code check:** Line 55 of `request-strategy/piece-request-order.go` exists; the code there is shown below. [code](https://github.com/anacrolix/torrent/blob/48ad1a8aca56922aca5d15632c58894985a71a69/request-strategy/piece-request-order.go#L55)
  <details><summary>Output</summary>

  ```
  52 | 	key PieceRequestOrderKey,
  53 | 	state PieceRequestOrderState,
  54 | ) {
  55 | 	oldState, ok := me.keys[key]
  56 | 	if !ok {
  57 | 		panic("key should have been added already")
  58 | 	}
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

### Claim 2: The crash occurs in version v1.47.0.

> /go/pkg/mod/github.com/anacrolix/torrent@v1.47.0/request-strategy/piece-request-order.go:55 +0x55

**Evidence:**

- **Static code check:** File `request-strategy/piece-request-order.go` exists in anacrolix/torrent at 48ad1a8. [code](https://github.com/anacrolix/torrent/blob/48ad1a8aca56922aca5d15632c58894985a71a69/request-strategy/piece-request-order.go)

- **Static code check:** `Update` is defined in `request-strategy/piece-request-order.go` line 51. [code](https://github.com/anacrolix/torrent/blob/48ad1a8aca56922aca5d15632c58894985a71a69/request-strategy/piece-request-order.go#L51)
  <details><summary>Output</summary>

  ```
  49 | }
  50 | 
  51 | func (me *PieceRequestOrder) Update(
  52 | 	key PieceRequestOrderKey,
  53 | 	state PieceRequestOrderState,
  54 | ) {
  55 | 	oldState, ok := me.keys[key]
  ```
  </details>

- **Static code check:** Line 55 of `request-strategy/piece-request-order.go` exists; the code there is shown below. [code](https://github.com/anacrolix/torrent/blob/48ad1a8aca56922aca5d15632c58894985a71a69/request-strategy/piece-request-order.go#L55)
  <details><summary>Output</summary>

  ```
  52 | 	key PieceRequestOrderKey,
  53 | 	state PieceRequestOrderState,
  54 | ) {
  55 | 	oldState, ok := me.keys[key]
  56 | 	if !ok {
  57 | 		panic("key should have been added already")
  58 | 	}
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

### Claim 3: The crash also occurs in version v1.48.0 when using qBittorrent/4.5.0.

> 2023-01-18T16:35:20+0000 ERR [main client github.com/anacrolix/torrent.(*Peer).receiveChunk:1536]: *torrent.PeerConn 0xc01b011b00 [id="-qB4500-5ZtA84Bi4!X_", exts=0000000000180005, v="qBittorrent/4.5.0"]: writing received chunk 151128: short write
> panic: runtime error: invalid memory address or nil pointer dereference

**Evidence:**

- **Static code check:** File `peerconn.go` exists in anacrolix/torrent at 48ad1a8. [code](https://github.com/anacrolix/torrent/blob/48ad1a8aca56922aca5d15632c58894985a71a69/peerconn.go)

- **Static code check:** `receiveChunk` is defined in `peerconn.go` line 1428. [code](https://github.com/anacrolix/torrent/blob/48ad1a8aca56922aca5d15632c58894985a71a69/peerconn.go#L1428)
  <details><summary>Output</summary>

  ```
  1426 | 
  1427 | // Handle a received chunk from a peer.
  1428 | func (c *Peer) receiveChunk(msg *pp.Message) error {
  1429 | 	chunksReceived.Add("total", 1)
  1430 | 
  1431 | 	ppReq := newRequestFromMessage(msg)
  1432 | 	t := c.t
  ```
  </details>

- **Static code check:** Line 1537 of `peerconn.go` exists; the code there is shown below. [code](https://github.com/anacrolix/torrent/blob/48ad1a8aca56922aca5d15632c58894985a71a69/peerconn.go#L1537)
  <details><summary>Output</summary>

  ```
  1534 | 
  1535 | 	if err != nil {
  1536 | 		c.logger.WithDefaultLevel(log.Error).Printf("writing received chunk %v: %v", req, err)
  1537 | 		t.pendRequest(req)
  1538 | 		// Necessary to pass TestReceiveChunkStorageFailureSeederFastExtensionDisabled. I think a
  1539 | 		// request update runs while we're writing the chunk that just failed. Then we never do a
  1540 | 		// fresh update after pending the failed request.
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

### Claim 4: Attempting to update to version v1.48.0 fails with an invalid version error.

> go: github.com/anacrolix/torrent@v1.48.0: invalid version: unknown revision v1.48.0

**Evidence:**

- No evidence recorded

**What is missing:**

- Recorded as context: environment and version details are not verified against the code.

---
Generated by Pramaan at 2026-10-31T22:56:59.754Z using gemma4:e2b-it-qat. Verdicts come from code checks, not from the model.
