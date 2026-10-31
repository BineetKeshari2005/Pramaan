# Pramaan evidence report: christiaangoossens/hass-oidc-auth#[334](https://github.com/christiaangoossens/hass-oidc-auth/issues/334)

**Verified commit:** [53e8594](https://github.com/christiaangoossens/hass-oidc-auth/commit/53e8594e5f2c67abe66c0217a6695383ec2c7951)

**Suggested label:** **Needs more information**
The evidence is not strong enough for a verdict; the report needs more detail.

_Suggested label only — Pramaan never closes issues._

| # | Claim | Verdict | Confidence | Human review |
|---|---|---|---|---|
| 1 | A routing mechanism change in Home Assistant causes the integration to attempt to inject the hass object instead of the actual frontend path. | Insufficient evidence | Low | Yes |
| 2 | Attempting to log in results in a 404 not found error because the page at /auth/authorize no longer exists. | Insufficient evidence | None | Yes |
| 3 | The issue occurs on Home Assistant version 2026.6.0.dev202605070318. | Insufficient evidence | None | No |
| 4 | The integration version is 1.1.0. | Insufficient evidence | None | No |
| 5 | The error occurs in custom_components/auth_oidc/endpoints/injected_auth_page.py at line 132. | Insufficient evidence | Low | No |
| 6 | The integration fails with an error stating it expected a str, bytes or os.PathLike object but received HomeAssistant. | Insufficient evidence | None | Yes |

### Claim 1: A routing mechanism change in Home Assistant causes the integration to attempt to inject the hass object instead of the actual frontend path.

> Some sort of routing mechanism changed within HA causing the integration to try to inject the hass object instead of the actual frontend path

**Evidence:**

- **Static code check:** File `custom_components/auth_oidc/endpoints/injected_auth_page.py` exists in christiaangoossens/hass-oidc-auth at 53e8594. [code](https://github.com/christiaangoossens/hass-oidc-auth/blob/53e8594e5f2c67abe66c0217a6695383ec2c7951/custom_components/auth_oidc/endpoints/injected_auth_page.py)

- **Text only:** `args` appears in `.pylintrc` line 293, but no definition was found (it may come from a dependency or be generated). [code](https://github.com/christiaangoossens/hass-oidc-auth/blob/53e8594e5f2c67abe66c0217a6695383ec2c7951/.pylintrc#L293)
  <details><summary>Output</summary>

  ```
  max-args=5
  ```
  </details>

- **Static code check:** Line 59 of `custom_components/auth_oidc/endpoints/injected_auth_page.py` exists; the code there is shown below. [code](https://github.com/christiaangoossens/hass-oidc-auth/blob/53e8594e5f2c67abe66c0217a6695383ec2c7951/custom_components/auth_oidc/endpoints/injected_auth_page.py#L59)
  <details><summary>Output</summary>

  ```
  56 |                 break
  57 | 
  58 |             # The original frontend path is the first argument of the handler
  59 |             frontend_path = route.handler.args[0]
  60 | 
  61 |             # Remove the old resource to prevent conflicts with our injected view
  62 |             resource.add_prefix("/auth/oidc/unused")
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

### Claim 2: Attempting to log in results in a 404 not found error because the page at /auth/authorize no longer exists.

> Try to login, a `404 not found` error will occur (since there is no longer a page at /auth/authorize)

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 3: The issue occurs on Home Assistant version 2026.6.0.dev202605070318.

> Home Assistant version: `2026.6.0.dev202605070318`

**Evidence:**

- No evidence recorded

**What is missing:**

- Recorded as context: environment and version details are not verified against the code.

### Claim 4: The integration version is 1.1.0.

> Integration version: `1.1.0`

**Evidence:**

- No evidence recorded

**What is missing:**

- Recorded as context: environment and version details are not verified against the code.

### Claim 5: The error occurs in custom_components/auth_oidc/endpoints/injected_auth_page.py at line 132.

> Logger: custom_components.auth_oidc.endpoints.injected_auth_page
> Bron: custom_components/auth_oidc/endpoints/injected_auth_page.py:132

**Evidence:**

- **Static code check:** File `custom_components/auth_oidc/endpoints/injected_auth_page.py` exists in christiaangoossens/hass-oidc-auth at 53e8594. [code](https://github.com/christiaangoossens/hass-oidc-auth/blob/53e8594e5f2c67abe66c0217a6695383ec2c7951/custom_components/auth_oidc/endpoints/injected_auth_page.py)

- **Text only:** `injected_auth_page` appears in `custom_components/auth_oidc/endpoints/__init__.py` line 5, but no definition was found (it may come from a dependency or be generated). [code](https://github.com/christiaangoossens/hass-oidc-auth/blob/53e8594e5f2c67abe66c0217a6695383ec2c7951/custom_components/auth_oidc/endpoints/__init__.py#L5)
  <details><summary>Output</summary>

  ```
  from .injected_auth_page import OIDCInjectedAuthPage as OIDCInjectedAuthPage
  ```
  </details>

- **Static code check:** Line 132 of `custom_components/auth_oidc/endpoints/injected_auth_page.py` exists; the code there is shown below. [code](https://github.com/christiaangoossens/hass-oidc-auth/blob/53e8594e5f2c67abe66c0217a6695383ec2c7951/custom_components/auth_oidc/endpoints/injected_auth_page.py#L132)
  <details><summary>Output</summary>

  ```
  129 |                 hass, provider, force_https, has_trusted_networks_provider_first
  130 |             )
  131 |         except Exception as e:  # pylint: disable=broad-except
  132 |             _LOGGER.error("Failed to inject OIDC auth page: %s", e)
  133 | 
  134 |     def _should_do_oidc_redirect(self, req: web.Request) -> bool:
  135 |         """Check if we should redirect to the OIDC flow."""
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

### Claim 6: The integration fails with an error stating it expected a str, bytes or os.PathLike object but received HomeAssistant.

> Failed to inject OIDC auth page: expected str, bytes or os.PathLike object, not HomeAssistant

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

---
Generated by Pramaan at 2026-10-31T20:41:10.123Z using gemma4:e2b-it-qat. Verdicts come from code checks, not from the model.
