# Pramaan evidence report: kliment/Printrun#[1393](https://github.com/kliment/Printrun/issues/1393)

**Verified commit:** [ef96f01](https://github.com/kliment/Printrun/commit/ef96f010ebd8a4020f26e913c316a3f0fd3a6420)

**Suggested label:** **Likely invalid**
Every checkable claim (1) is contradicted by the code or docs.

_Suggested label only — Pramaan never closes issues._

| # | Claim | Verdict | Confidence | Human review |
|---|---|---|---|---|
| 1 | Calling update_tempdisplay in printrun pronterface.py raises a ValueError: could not convert string to float: ''. | Insufficient evidence | Low | Yes |
| 2 | The user is running Pronterface version 2.0.1 (x64 package). | Insufficient evidence | None | No |
| 3 | The user is running MKS SBASE v1.3. | Insufficient evidence | None | No |
| 4 | The user attempted to use baud rates of 9600, 115200, and 250000. | Insufficient evidence | None | No |
| 5 | The original author suggests updating Pronterface to the latest version. | Insufficient evidence | Low | Yes |
| 6 | Running the executable as Administrator allows the user to connect and use the printer and prevents the 'value error'. | Insufficient evidence | Low | Yes |
| 7 | The printer becomes paralyzed and unresponsive when configuration edits are made. | Insufficient evidence | Low | Yes |
| 8 | The printer boots but shows 0/0 temperatures for bed and hotend when the configuration file is deemed 'corrupted'. | Insufficient evidence | Low | Yes |
| 9 | The user copied configuration values from Smoothieware/Smoothieboard config. | Contradicted | Medium | No |

### Claim 1: Calling update_tempdisplay in printrun
pronterface.py raises a ValueError: could not convert string to float: ''.

> ValueError: could not convert string to float: ''

**Evidence:**

- **Static code check:** File `printrun/pronterface.py` exists in kliment/Printrun at ef96f01. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py)

- **Static code check:** `update_tempdisplay` is defined in `printrun/pronterface.py` line 1994. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1994)
  <details><summary>Output</summary>

  ```
  1992 |             wx.CallAfter(self.gviz.setlayer, newlayer)
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  1998 |             for name in 'T', 'T0', 'T1', 'B':
  ```
  </details>

- **Static code check:** Line 1995 of `printrun/pronterface.py` exists; the code there is shown below. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1992 |             wx.CallAfter(self.gviz.setlayer, newlayer)
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  1998 |             for name in 'T', 'T0', 'T1', 'B':
  ```
  </details>

- **Static code check:** All 6 stack frames inside the repository match the code at ef96f01, so the trace is consistent with this code path.

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

- The crash itself was not reproduced by running the reported command.

- The report includes a Python snippet, but the Docker sandbox is not running, so it was not executed.

### Claim 2: The user is running Pronterface version 2.0.1 (x64 package).

> I'm running 2.0.1 from the official site. x64 package.

**Evidence:**

- No evidence recorded

**What is missing:**

- Recorded as context: environment and version details are not verified against the code.

### Claim 3: The user is running MKS SBASE v1.3.

> LUME Plus printer based on MKS SBASE v1.3 and smoothieware

**Evidence:**

- No evidence recorded

**What is missing:**

- Recorded as context: environment and version details are not verified against the code.

### Claim 4: The user attempted to use baud rates of 9600, 115200, and 250000.

> I tried all the available ports with combinations of Baud rates of 9600 115200 and 250000.

**Evidence:**

- No evidence recorded

**What is missing:**

- Recorded as context: environment and version details are not verified against the code.

### Claim 5: The original author suggests updating Pronterface to the latest version.

> Guess, you are running an old version of Pronterface. Please update to the latest version.

**Evidence:**

- **Static code check:** All 6 stack frames inside the repository match the code at ef96f01, so the trace is consistent with this code path.

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

**What is missing:**

- The crash itself was not reproduced by running the reported command.

### Claim 6: Running the executable as Administrator allows the user to connect and use the printer and prevents the 'value error'.

> After using the Administrator mode for running the executable I am able to connect, use the printer and I do not get that "value error" anymore.

**Evidence:**

- **Static code check:** All 6 stack frames inside the repository match the code at ef96f01, so the trace is consistent with this code path.

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

**What is missing:**

- The crash itself was not reproduced by running the reported command.

- The report includes a Python snippet, but the Docker sandbox is not running, so it was not executed.

### Claim 7: The printer becomes paralyzed and unresponsive when configuration edits are made.

> After config edits my printer is paralyzed. So we won't even know if it isn't connecting due to comms problem or due to its paralyzed state.

**Evidence:**

- **Static code check:** All 6 stack frames inside the repository match the code at ef96f01, so the trace is consistent with this code path.

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

**What is missing:**

- The crash itself was not reproduced by running the reported command.

- The report includes a Python snippet, but the Docker sandbox is not running, so it was not executed.

### Claim 8: The printer boots but shows 0/0 temperatures for bed and hotend when the configuration file is deemed 'corrupted'.

> It boots and allows me to browse the LCD menus but won't respond to any commands. Motors quiet, bed and hotend temps at 0/0.

**Evidence:**

- **Static code check:** All 6 stack frames inside the repository match the code at ef96f01, so the trace is consistent with this code path.

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

- **Static code check:** Frame `printrun/pronterface.py:1995` in `update_tempdisplay` matches the code. [code](https://github.com/kliment/Printrun/blob/ef96f010ebd8a4020f26e913c316a3f0fd3a6420/printrun/pronterface.py#L1995)
  <details><summary>Output</summary>

  ```
  1993 | 
  1994 |     def update_tempdisplay(self):
  1995 |         try:
  1996 |             temps = parse_temperature_report(self.tempreadings)
  1997 | 
  ```
  </details>

**What is missing:**

- The crash itself was not reproduced by running the reported command.

- The report includes a Python snippet, but the Docker sandbox is not running, so it was not executed.

### Claim 9: The user copied configuration values from Smoothieware/Smoothieboard config.

> Grabbed the Smoothieware/Smoothieware/tree/edge/ConfigSamples/Smoothieboard config and copied to it all the values (by hand) from the latest smoothieware config from the LUME manufacturer.

**Evidence:**

- **Static code check:** File `Smoothieware/Smoothieware/tree/edge/ConfigSamples/Smoothieboard config` does not exist in kliment/Printrun at ef96f01.

**What is missing:**

- The report names code that does not exist at ef96f01. Ask the reporter for the exact version or commit they used.

---
Generated by Pramaan at 2026-10-31T21:11:20.439Z using gemma4:e2b-it-qat. Verdicts come from code checks, not from the model.
