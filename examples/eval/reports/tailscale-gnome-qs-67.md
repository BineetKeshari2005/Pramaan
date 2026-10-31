# Pramaan evidence report: tailscale-qs/tailscale-gnome-qs#[67](https://github.com/tailscale-qs/tailscale-gnome-qs/issues/67)

**Verified commit:** [5330071](https://github.com/tailscale-qs/tailscale-gnome-qs/commit/5330071aae8868c9f4daec35869be79c072fdf19)

**Suggested label:** **Likely invalid**
Every checkable claim (1) is contradicted by the code or docs.

_Suggested label only — Pramaan never closes issues._

| # | Claim | Verdict | Confidence | Human review |
|---|---|---|---|---|
| 1 | The Nodes submenu in the Tailscale quick settings menu does not open when clicked on GNOME Shell 50.6. | Insufficient evidence | None | Yes |
| 2 | The issue occurs on GNOME Shell 50.6, Wayland, and Fedora 44. | Insufficient evidence | None | No |
| 3 | The extension is Tailscale QS v11 (version 18). | Insufficient evidence | None | No |
| 4 | The cause is attributed to `PopupScrollableSubMenuMenuItem` in `extension.js` overriding internals of `PopupSubMenu`. | Contradicted | Medium | No |
| 5 | The override includes setting `this.menu._needsScrollbar` to true and setting `this.menu.box.height` to 200. | Insufficient evidence | Low | No |
| 6 | Replacing the two lines with `this.menu.actor.style = 'max-height: 200px;'` fixes the issue, allowing the Nodes submenu to open and scroll normally. | Insufficient evidence | Low | No |
| 7 | Replacing the lines with the CSS fix did not fix the issue after a full reboot. | Insufficient evidence | Low | No |
| 8 | Using `const mnodes = new PopupMenu.PopupSubMenuMenuItem(_('Nodes'), false, {});` works by creating the Nodes item as a plain submenu. | Insufficient evidence | Low | No |
| 9 | Deleting and reinstalling the extension resolves the issue. | Insufficient evidence | None | Yes |

### Claim 1: The Nodes submenu in the Tailscale quick settings menu does not open when clicked on GNOME Shell 50.6.

> On GNOME Shell 50.6 (Fedora 44) the **Nodes** submenu in the Tailscale quick settings menu does not open when clicked.

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

### Claim 2: The issue occurs on GNOME Shell 50.6, Wayland, and Fedora 44.

> GNOME Shell 50.6 (Fedora 44)

**Evidence:**

- No evidence recorded

**What is missing:**

- Recorded as context: environment and version details are not verified against the code.

### Claim 3: The extension is Tailscale QS v11 (version 18).

> Tailscale QS v11 (version 18)

**Evidence:**

- No evidence recorded

**What is missing:**

- Recorded as context: environment and version details are not verified against the code.

### Claim 4: The cause is attributed to `PopupScrollableSubMenuMenuItem` in `extension.js` overriding internals of `PopupSubMenu`.

> `PopupScrollableSubMenuMenuItem` in `extension.js` overrides internals of `PopupSubMenu`:

**Evidence:**

- **Static code check:** `PopupSubMenu` is not defined or used anywhere in tailscale-qs/tailscale-gnome-qs at 5330071.

- **Static code check:** File `tailscale-gnome-qs@tailscale-qs.github.io/extension.js` exists in tailscale-qs/tailscale-gnome-qs at 5330071. [code](https://github.com/tailscale-qs/tailscale-gnome-qs/blob/5330071aae8868c9f4daec35869be79c072fdf19/tailscale-gnome-qs%40tailscale-qs.github.io/extension.js)

- **Static code check:** `PopupScrollableSubMenuMenuItem` is defined in `tailscale-gnome-qs@tailscale-qs.github.io/extension.js` line 203 (and 1 more place). [code](https://github.com/tailscale-qs/tailscale-gnome-qs/blob/5330071aae8868c9f4daec35869be79c072fdf19/tailscale-gnome-qs%40tailscale-qs.github.io/extension.js#L203)
  <details><summary>Output</summary>

  ```
  201 | );
  202 | 
  203 | const PopupScrollableSubMenuMenuItem = GObject.registerClass(
  204 |   class PopupScrollableSubMenuMenuItem extends PopupMenu.PopupSubMenuMenuItem {
  205 |       _init(props) {
  206 |           super._init(props);
  207 | 
  ```
  </details>

- **Static code check:** Line 1 of `tailscale-gnome-qs@tailscale-qs.github.io/extension.js` exists; the code there is shown below. [code](https://github.com/tailscale-qs/tailscale-gnome-qs/blob/5330071aae8868c9f4daec35869be79c072fdf19/tailscale-gnome-qs%40tailscale-qs.github.io/extension.js#L1)
  <details><summary>Output</summary>

  ```
  1 | /* extension.js
  2 |  *
  3 |  * This program is free software: you can redistribute it and/or modify
  4 |  * it under the terms of the GNU General Public License as published by
  ```
  </details>

**What is missing:**

- The report names code that does not exist at 5330071. Ask the reporter for the exact version or commit they used.

### Claim 5: The override includes setting `this.menu._needsScrollbar` to true and setting `this.menu.box.height` to 200.

> this.menu._needsScrollbar = () =&gt; true; this.menu.box.height = 200;

**Evidence:**

- **Static code check:** File `tailscale-gnome-qs@tailscale-qs.github.io/extension.js` exists in tailscale-qs/tailscale-gnome-qs at 5330071. [code](https://github.com/tailscale-qs/tailscale-gnome-qs/blob/5330071aae8868c9f4daec35869be79c072fdf19/tailscale-gnome-qs%40tailscale-qs.github.io/extension.js)

- **Text only:** `this.menu.box.height` is not in the repository; it may be the reporter's own file.

- **Text only:** `menu` appears in `LICENSE` line 110, but no definition was found (it may come from a dependency or be generated). [code](https://github.com/tailscale-qs/tailscale-gnome-qs/blob/5330071aae8868c9f4daec35869be79c072fdf19/LICENSE#L110)
  <details><summary>Output</summary>

  ```
  menu, a prominent item in the list meets this criterion.
  ```
  </details>

- **Static code check:** `_needsScrollbar` is defined in `tailscale-gnome-qs@tailscale-qs.github.io/extension.js` line 208. [code](https://github.com/tailscale-qs/tailscale-gnome-qs/blob/5330071aae8868c9f4daec35869be79c072fdf19/tailscale-gnome-qs%40tailscale-qs.github.io/extension.js#L208)
  <details><summary>Output</summary>

  ```
  206 |           super._init(props);
  207 | 
  208 |           this.menu._needsScrollbar = () => true;
  209 |           this.menu.box.height = 200;
  210 |       }
  211 |   }
  212 | );
  ```
  </details>

- **Static code check:** Line 2 of `tailscale-gnome-qs@tailscale-qs.github.io/extension.js` exists; the code there is shown below. [code](https://github.com/tailscale-qs/tailscale-gnome-qs/blob/5330071aae8868c9f4daec35869be79c072fdf19/tailscale-gnome-qs%40tailscale-qs.github.io/extension.js#L2)
  <details><summary>Output</summary>

  ```
  1 | /* extension.js
  2 |  *
  3 |  * This program is free software: you can redistribute it and/or modify
  4 |  * it under the terms of the GNU General Public License as published by
  5 |  * the Free Software Foundation, either version 2 of the License, or
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

### Claim 6: Replacing the two lines with `this.menu.actor.style = 'max-height: 200px;'` fixes the issue, allowing the Nodes submenu to open and scroll normally.

> this.menu.actor.style = 'max-height: 200px;'; The Nodes submenu then opens and scrolls normally.

**Evidence:**

- **Static code check:** File `tailscale-gnome-qs@tailscale-qs.github.io/extension.js` exists in tailscale-qs/tailscale-gnome-qs at 5330071. [code](https://github.com/tailscale-qs/tailscale-gnome-qs/blob/5330071aae8868c9f4daec35869be79c072fdf19/tailscale-gnome-qs%40tailscale-qs.github.io/extension.js)

- **Text only:** `menu` appears in `LICENSE` line 110, but no definition was found (it may come from a dependency or be generated). [code](https://github.com/tailscale-qs/tailscale-gnome-qs/blob/5330071aae8868c9f4daec35869be79c072fdf19/LICENSE#L110)
  <details><summary>Output</summary>

  ```
  menu, a prominent item in the list meets this criterion.
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

### Claim 7: Replacing the lines with the CSS fix did not fix the issue after a full reboot.

> Correction to the workaround in the description: replacing the two lines with `this.menu.actor.style = 'max-height: 200px;';` did **not** fix it after a full reboot (an earlier test was misleading).

**Evidence:**

- **Static code check:** File `tailscale-gnome-qs@tailscale-qs.github.io/extension.js` exists in tailscale-qs/tailscale-gnome-qs at 5330071. [code](https://github.com/tailscale-qs/tailscale-gnome-qs/blob/5330071aae8868c9f4daec35869be79c072fdf19/tailscale-gnome-qs%40tailscale-qs.github.io/extension.js)

- **Text only:** `menu` appears in `LICENSE` line 110, but no definition was found (it may come from a dependency or be generated). [code](https://github.com/tailscale-qs/tailscale-gnome-qs/blob/5330071aae8868c9f4daec35869be79c072fdf19/LICENSE#L110)
  <details><summary>Output</summary>

  ```
  menu, a prominent item in the list meets this criterion.
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

### Claim 8: Using `const mnodes = new PopupMenu.PopupSubMenuMenuItem(_('Nodes'), false, {});` works by creating the Nodes item as a plain submenu.

> const mnodes = new PopupMenu.PopupSubMenuMenuItem(_('Nodes'), false, {}); The Nodes submenu then opens and lists the nodes.

**Evidence:**

- **Static code check:** File `tailscale-gnome-qs@tailscale-qs.github.io/extension.js` exists in tailscale-qs/tailscale-gnome-qs at 5330071. [code](https://github.com/tailscale-qs/tailscale-gnome-qs/blob/5330071aae8868c9f4daec35869be79c072fdf19/tailscale-gnome-qs%40tailscale-qs.github.io/extension.js)

- **Text only:** `PopupMenu` appears in `tailscale-gnome-qs@tailscale-qs.github.io/extension.js` line 29, but no definition was found (it may come from a dependency or be generated). [code](https://github.com/tailscale-qs/tailscale-gnome-qs/blob/5330071aae8868c9f4daec35869be79c072fdf19/tailscale-gnome-qs%40tailscale-qs.github.io/extension.js#L29)
  <details><summary>Output</summary>

  ```
  import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
  ```
  </details>

- **Static code check:** Line 4 of `tailscale-gnome-qs@tailscale-qs.github.io/extension.js` exists; the code there is shown below. [code](https://github.com/tailscale-qs/tailscale-gnome-qs/blob/5330071aae8868c9f4daec35869be79c072fdf19/tailscale-gnome-qs%40tailscale-qs.github.io/extension.js#L4)
  <details><summary>Output</summary>

  ```
  1 | /* extension.js
  2 |  *
  3 |  * This program is free software: you can redistribute it and/or modify
  4 |  * it under the terms of the GNU General Public License as published by
  5 |  * the Free Software Foundation, either version 2 of the License, or
  6 |  * (at your option) any later version.
  7 |  *
  ```
  </details>

**What is missing:**

- The referenced code exists, but the described behavior was not executed.

### Claim 9: Deleting and reinstalling the extension resolves the issue.

> After deleting and reinstalling the extension seems to work fine!

**Evidence:**

- No evidence recorded

**What is missing:**

- No check could test this claim automatically.

---
Generated by Pramaan at 2026-10-31T22:56:34.260Z using gemma4:e2b-it-qat. Verdicts come from code checks, not from the model.
