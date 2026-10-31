# Pramaan evidence report: bcgit/bc-java#[2497](https://github.com/bcgit/bc-java/issues/2497)

**Verified commit:** [3396418](https://github.com/bcgit/bc-java/commit/3396418e25c9ee9b8a9b3a3747ff40a24bf934b9)

**Suggested label:** **Needs human review**
A security claim could not be settled automatically; a maintainer should look.

**Best guess if a label must be chosen:** Likely invalid: The report has no checkable technical detail: no code references, steps, logs or traces. _(a guess from fixed evidence rules, not a verdict)_

_Suggested label only — Pramaan never closes issues._

| # | Claim | Verdict | Confidence | Human review |
|---|---|---|---|---|
| 1 | The Bouncy Castle Crypto package is a Java implementation of cryptographic algorithms. | Insufficient evidence | None | Yes |
| 2 | The raw JCA provider's legacy PBES1 (PKCS#5 scheme 1) and PKCS#12 PBE families ran their password-based key derivation with an iteration count taken from untrusted input without bounding it. | Insufficient evidence | None | Yes |
| 3 | The AlgorithmParameters implementations (PKCS12PBE and its object identifier aliases, and PBKDF1) accepted any count from an encoded PKCS12PBEParams or PBEParameter, narrowing a value beyond the int range with intValue(), and every Cipher, Mac and SecretKeyFactory in these families derived with whatever count it was given, including one decoded by another provider's AlgorithmParameters, as when javax.crypto.EncryptedPrivateKeyInfo.getKeySpec() decrypts a PKCS#⁠12 PBE-protected private key with BC. | Insufficient evidence | None | Yes |
| 4 | Both the parameter parse and the derivations now reject a negative or over-limit count under the org.bouncycastle.pbe.max_iteration_count property (default 10,000,000) that already bounded PBKDF2 (https://github.com/advisories/GHSA-m3x3-p27c-whhp), and the parse rejects a count beyond the int range rather than narrowing it. | Insufficient evidence | None | Yes |
| 5 | This issue affects Bouncy Castle for Java LTS. | Insufficient evidence | None | No |

### Claim 1: The Bouncy Castle Crypto package is a Java implementation of cryptographic algorithms.

> The Bouncy Castle Crypto package is a Java implementation of cryptographic algorithms.

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 2: The raw JCA provider's legacy PBES1 (PKCS#5 scheme 1) and PKCS#12 PBE families ran their password-based key derivation with an iteration count taken from untrusted input without bounding it.

> In Bouncy Castle for Java , the raw JCA provider's legacy PBES1 (PKCS#⁠5 scheme 1) and PKCS#⁠12 PBE families ran their password-based key derivation with an iteration count taken from untrusted input without bounding it, so a small input could dictate an arbitrary amount of work before anything could be verified.

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 3: The AlgorithmParameters implementations (PKCS12PBE and its object identifier aliases, and PBKDF1) accepted any count from an encoded PKCS12PBEParams or PBEParameter, narrowing a value beyond the int range with intValue(), and every Cipher, Mac and SecretKeyFactory in these families derived with whatever count it was given, including one decoded by another provider's AlgorithmParameters, as when javax.crypto.EncryptedPrivateKeyInfo.getKeySpec() decrypts a PKCS#⁠12 PBE-protected private key with BC.

> The AlgorithmParameters implementations (PKCS12PBE and its object identifier aliases, and PBKDF1) accepted any count from an encoded PKCS12PBEParams or PBEParameter, narrowing a value beyond the int range with intValue(), and every Cipher, Mac and SecretKeyFactory in these families derived with whatever count it was given, including one decoded by another provider's AlgorithmParameters, as when javax.crypto.EncryptedPrivateKeyInfo.getKeySpec() decrypts a PKCS#⁠12 PBE-protected private key with BC.

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 4: Both the parameter parse and the derivations now reject a negative or over-limit count under the org.bouncycastle.pbe.max_iteration_count property (default 10,000,000) that already bounded PBKDF2 (https://github.com/advisories/GHSA-m3x3-p27c-whhp), and the parse rejects a count beyond the int range rather than narrowing it.

> Both the parameter parse and the derivations now reject a negative or over-limit count under the org.bouncycastle.pbe.max_iteration_count property (default 10,000,000) that already bounded PBKDF2 (https://github.com/advisories/GHSA-m3x3-p27c-whhp), and the parse rejects a count beyond the int range rather than narrowing it.

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 5: This issue affects Bouncy Castle for Java LTS.

> This issue also affects Bouncy Castle for Java LTS .

**Evidence:**

- No evidence recorded

**What is missing:**

- Recorded as context: environment and version details are not verified against the code.

---
Generated by Pramaan at 2026-10-31T22:25:28.841Z using gemma4:e2b-it-qat. Verdicts come from code checks, not from the model.
