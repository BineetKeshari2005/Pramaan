# Pramaan evidence report: time4tea/gopro-dashboard-overlay#[241](https://github.com/time4tea/gopro-dashboard-overlay/issues/241)

**Verified commit:** [034342e](https://github.com/time4tea/gopro-dashboard-overlay/commit/034342e790a87bff2bce697123e4fc1204348f63)

**Suggested label:** **Needs human review**
A security claim could not be settled automatically; a maintainer should look.

_Suggested label only — Pramaan never closes issues._

| # | Claim | Verdict | Confidence | Human review |
|---|---|---|---|---|
| 1 | The script fails during the final render process. | Contradicted | Medium | No |
| 2 | The script raises a KeyError indicating that text features are unsupported without libraqm. | Contradicted | Medium | No |
| 3 | The functionality of the gopro_overlay library is dependent on libraqm. | Insufficient evidence | Low | Yes |

### Claim 1: The script fails during the final render process.

> I have tried to follow instructions but am running into issues when doing the final render

**Evidence:**

- **Static code check:** File `PIL/ImageFont.py` does not exist in time4tea/gopro-dashboard-overlay at 034342e.

- **Static code check:** File `bin/gopro-dashboard.py` exists in time4tea/gopro-dashboard-overlay at 034342e. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/bin/gopro-dashboard.py)

- **Static code check:** File `gopro_overlay/timing.py` exists in time4tea/gopro-dashboard-overlay at 034342e. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/timing.py)

- **Static code check:** File `gopro_overlay/layout.py` exists in time4tea/gopro-dashboard-overlay at 034342e. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/layout.py)

- **Static code check:** File `gopro_overlay/widgets/widgets.py` exists in time4tea/gopro-dashboard-overlay at 034342e. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/widgets/widgets.py)

- **Static code check:** File `gopro_overlay/widgets/text.py` exists in time4tea/gopro-dashboard-overlay at 034342e. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/widgets/text.py)

- **Text only:** `draw_timer` appears in `bin/gopro-dashboard.py` line 336, but no definition was found (it may come from a dependency or be generated). [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/bin/gopro-dashboard.py#L336)
  <details><summary>Output</summary>

  ```
  draw_timer = PoorTimer("drawing frames")
  ```
  </details>

- **Static code check:** `draw` is defined in `gopro_overlay/buffering.py` line 16 (and 2 more places). [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/buffering.py#L16)
  <details><summary>Output</summary>

  ```
  14 | 
  15 | class DrawBuffer:
  16 |     def draw(self, f: Callable[[Image.Image], Any]):
  17 |         raise NotImplementedError()
  18 | 
  19 | 
  20 | class SingleBuffer(DrawBuffer):
  ```
  </details>

- **Static code check:** `draw` is defined in `gopro_overlay/buffering.py` line 16 (and 2 more places). [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/buffering.py#L16)
  <details><summary>Output</summary>

  ```
  14 | 
  15 | class DrawBuffer:
  16 |     def draw(self, f: Callable[[Image.Image], Any]):
  17 |         raise NotImplementedError()
  18 | 
  19 | 
  20 | class SingleBuffer(DrawBuffer):
  ```
  </details>

- **Static code check:** `draw` is defined in `gopro_overlay/buffering.py` line 16 (and 2 more places). [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/buffering.py#L16)
  <details><summary>Output</summary>

  ```
  14 | 
  15 | class DrawBuffer:
  16 |     def draw(self, f: Callable[[Image.Image], Any]):
  17 |         raise NotImplementedError()
  18 | 
  19 | 
  20 | class SingleBuffer(DrawBuffer):
  ```
  </details>

- **Text only:** `getbbox` appears in `gopro_overlay/widgets/text.py` line 36, but no definition was found (it may come from a dependency or be generated). [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/widgets/text.py#L36)
  <details><summary>Output</summary>

  ```
  x0, y0, x1, y1 = self.font.getbbox(
  ```
  </details>

- **Static code check:** Line 291 of `bin/gopro-dashboard.py` exists; the code there is shown below. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/bin/gopro-dashboard.py#L291)
  <details><summary>Output</summary>

  ```
  288 |                         api_key_finder=api_key_finder(config_loader, args)
  289 |                     )
  290 |             ).open(args.map_style) as renderer:
  291 | 
  292 |                 if args.profiler:
  293 |                     profiler = WidgetProfiler()
  294 |                 else:
  ```
  </details>

- **Static code check:** Line 20 of `gopro_overlay/timing.py` exists; the code there is shown below. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/timing.py#L20)
  <details><summary>Output</summary>

  ```
  17 |             yield
  18 | 
  19 | 
  20 | class PoorTimer:
  21 | 
  22 |     def __init__(self, name, indent=0):
  23 |         self.name = name
  ```
  </details>

- **Static code check:** Line 106 of `gopro_overlay/layout.py` exists; the code there is shown below. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/layout.py#L106)
  <details><summary>Output</summary>

  ```
  103 |     def draw(self, pts, image: Image.Image) -> Image.Image:
  104 |         self._entry = self.framemeta.get(pts)
  105 |         return self.scene.draw(image)
  106 | 
  ```
  </details>

- **Static code check:** Line 231 of `gopro_overlay/widgets/widgets.py` exists; the code there is shown below. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/widgets/widgets.py#L231)
  <details><summary>Output</summary>

  ```
  228 | class FrameSupplier:
  229 |     def drawing_frame(self) -> Image:
  230 |         raise NotImplementedError()
  231 | 
  232 | 
  233 | class SimpleFrameSupplier(FrameSupplier):
  234 | 
  ```
  </details>

- **Static code check:** Line 27 of `gopro_overlay/widgets/widgets.py` exists; the code there is shown below. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/widgets/widgets.py#L27)
  <details><summary>Output</summary>

  ```
  24 | 
  25 | class Composite(Widget):
  26 | 
  27 |     def __init__(self, *widgets):
  28 |         self.widgets = widgets
  29 | 
  30 |     def draw(self, image: Image, draw: ImageDraw):
  ```
  </details>

- **Static code check:** Line 145 of `gopro_overlay/widgets/widgets.py` exists; the code there is shown below. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/widgets/widgets.py#L145)
  <details><summary>Output</summary>

  ```
  142 | 
  143 |     def __init__(self, at: Coordinate, widget):
  144 |         self.at = at
  145 |         self.widget = widget
  146 | 
  147 |     def draw(self, image: Image, draw: ImageDraw):
  148 |         ivp = ImageTranslate(self.at, image)
  ```
  </details>

- **Static code check:** Line 36 of `gopro_overlay/widgets/text.py` exists; the code there is shown below. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/widgets/text.py#L36)
  <details><summary>Output</summary>

  ```
  33 |         cached = self.cache.get(text, None)
  34 | 
  35 |         if cached is None:
  36 |             x0, y0, x1, y1 = self.font.getbbox(
  37 |                 text=text,
  38 |                 stroke_width=self.stroke_width,
  39 |                 anchor=self.anchor,
  ```
  </details>

- **Static code check:** Frame `gopro_overlay/timing.py:20` in `time` does not line up: `time` is defined at `gopro_overlay/layout.py:22` instead. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/timing.py)

- **Static code check:** Frame `bin/gopro-dashboard.py:291` in `&lt;module&gt;` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/bin/gopro-dashboard.py#L291)
  <details><summary>Output</summary>

  ```
  289 |                     )
  290 |             ).open(args.map_style) as renderer:
  291 | 
  292 |                 if args.profiler:
  293 |                     profiler = WidgetProfiler()
  ```
  </details>

- **Static code check:** Frame `bin/gopro-dashboard.py:291` in `&lt;lambda&gt;` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/bin/gopro-dashboard.py#L291)
  <details><summary>Output</summary>

  ```
  289 |                     )
  290 |             ).open(args.map_style) as renderer:
  291 | 
  292 |                 if args.profiler:
  293 |                     profiler = WidgetProfiler()
  ```
  </details>

- **Static code check:** Frame `gopro_overlay/layout.py:106` in `draw` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/layout.py#L106)
  <details><summary>Output</summary>

  ```
  104 |         self._entry = self.framemeta.get(pts)
  105 |         return self.scene.draw(image)
  106 | 
  ```
  </details>

- **Static code check:** Frame `gopro_overlay/widgets/widgets.py:231` in `draw` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/widgets/widgets.py#L231)
  <details><summary>Output</summary>

  ```
  229 |     def drawing_frame(self) -> Image:
  230 |         raise NotImplementedError()
  231 | 
  232 | 
  233 | class SimpleFrameSupplier(FrameSupplier):
  ```
  </details>

- **Static code check:** Frame `gopro_overlay/widgets/widgets.py:27` in `draw` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/widgets/widgets.py#L27)
  <details><summary>Output</summary>

  ```
  25 | class Composite(Widget):
  26 | 
  27 |     def __init__(self, *widgets):
  28 |         self.widgets = widgets
  29 | 
  ```
  </details>

- **Static code check:** Frame `gopro_overlay/widgets/widgets.py:145` in `draw` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/widgets/widgets.py#L145)
  <details><summary>Output</summary>

  ```
  143 |     def __init__(self, at: Coordinate, widget):
  144 |         self.at = at
  145 |         self.widget = widget
  146 | 
  147 |     def draw(self, image: Image, draw: ImageDraw):
  ```
  </details>

- **Static code check:** Frame `gopro_overlay/widgets/widgets.py:27` in `draw` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/widgets/widgets.py#L27)
  <details><summary>Output</summary>

  ```
  25 | class Composite(Widget):
  26 | 
  27 |     def __init__(self, *widgets):
  28 |         self.widgets = widgets
  29 | 
  ```
  </details>

- **Static code check:** Frame `gopro_overlay/widgets/text.py:36` in `draw` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/widgets/text.py#L36)
  <details><summary>Output</summary>

  ```
  34 | 
  35 |         if cached is None:
  36 |             x0, y0, x1, y1 = self.font.getbbox(
  37 |                 text=text,
  38 |                 stroke_width=self.stroke_width,
  ```
  </details>

**What is missing:**

- The report names code that does not exist at 034342e. Ask the reporter for the exact version or commit they used.

- 1 of 9 trace frames are at different lines than at 034342e (1 frame outside the repository was skipped); the report is probably from another version. Ask for the exact version or commit.

### Claim 2: The script raises a KeyError indicating that text features are unsupported without libraqm.

> KeyError: 'setting text direction, language or font features is not supported without libraqm'

**Evidence:**

- **Static code check:** File `venv/lib/python3.9/site-packages/PIL/ImageFont.py` does not exist in time4tea/gopro-dashboard-overlay at 034342e.

- **Static code check:** File `PIL/ImageFont.py` (cited at line 421) does not exist in time4tea/gopro-dashboard-overlay at 034342e.

- **Text only:** `getbbox` appears in `gopro_overlay/widgets/text.py` line 36, but no definition was found (it may come from a dependency or be generated). [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/widgets/text.py#L36)
  <details><summary>Output</summary>

  ```
  x0, y0, x1, y1 = self.font.getbbox(
  ```
  </details>

- **Static code check:** Frame `gopro_overlay/timing.py:20` in `time` does not line up: `time` is defined at `gopro_overlay/layout.py:22` instead. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/timing.py)

- **Static code check:** Frame `bin/gopro-dashboard.py:291` in `&lt;module&gt;` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/bin/gopro-dashboard.py#L291)
  <details><summary>Output</summary>

  ```
  289 |                     )
  290 |             ).open(args.map_style) as renderer:
  291 | 
  292 |                 if args.profiler:
  293 |                     profiler = WidgetProfiler()
  ```
  </details>

- **Static code check:** Frame `bin/gopro-dashboard.py:291` in `&lt;lambda&gt;` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/bin/gopro-dashboard.py#L291)
  <details><summary>Output</summary>

  ```
  289 |                     )
  290 |             ).open(args.map_style) as renderer:
  291 | 
  292 |                 if args.profiler:
  293 |                     profiler = WidgetProfiler()
  ```
  </details>

- **Static code check:** Frame `gopro_overlay/layout.py:106` in `draw` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/layout.py#L106)
  <details><summary>Output</summary>

  ```
  104 |         self._entry = self.framemeta.get(pts)
  105 |         return self.scene.draw(image)
  106 | 
  ```
  </details>

- **Static code check:** Frame `gopro_overlay/widgets/widgets.py:231` in `draw` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/widgets/widgets.py#L231)
  <details><summary>Output</summary>

  ```
  229 |     def drawing_frame(self) -> Image:
  230 |         raise NotImplementedError()
  231 | 
  232 | 
  233 | class SimpleFrameSupplier(FrameSupplier):
  ```
  </details>

- **Static code check:** Frame `gopro_overlay/widgets/widgets.py:27` in `draw` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/widgets/widgets.py#L27)
  <details><summary>Output</summary>

  ```
  25 | class Composite(Widget):
  26 | 
  27 |     def __init__(self, *widgets):
  28 |         self.widgets = widgets
  29 | 
  ```
  </details>

- **Static code check:** Frame `gopro_overlay/widgets/widgets.py:145` in `draw` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/widgets/widgets.py#L145)
  <details><summary>Output</summary>

  ```
  143 |     def __init__(self, at: Coordinate, widget):
  144 |         self.at = at
  145 |         self.widget = widget
  146 | 
  147 |     def draw(self, image: Image, draw: ImageDraw):
  ```
  </details>

- **Static code check:** Frame `gopro_overlay/widgets/widgets.py:27` in `draw` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/widgets/widgets.py#L27)
  <details><summary>Output</summary>

  ```
  25 | class Composite(Widget):
  26 | 
  27 |     def __init__(self, *widgets):
  28 |         self.widgets = widgets
  29 | 
  ```
  </details>

- **Static code check:** Frame `gopro_overlay/widgets/text.py:36` in `draw` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/widgets/text.py#L36)
  <details><summary>Output</summary>

  ```
  34 | 
  35 |         if cached is None:
  36 |             x0, y0, x1, y1 = self.font.getbbox(
  37 |                 text=text,
  38 |                 stroke_width=self.stroke_width,
  ```
  </details>

**What is missing:**

- The report names code that does not exist at 034342e. Ask the reporter for the exact version or commit they used.

- 1 of 9 trace frames are at different lines than at 034342e (1 frame outside the repository was skipped); the report is probably from another version. Ask for the exact version or commit.

### Claim 3: The functionality of the gopro_overlay library is dependent on libraqm.

> KeyError: 'setting text direction, language or font features is not supported without libraqm'

**Evidence:**

- **Static code check:** Frame `gopro_overlay/timing.py:20` in `time` does not line up: `time` is defined at `gopro_overlay/layout.py:22` instead. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/timing.py)

- **Static code check:** Frame `bin/gopro-dashboard.py:291` in `&lt;module&gt;` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/bin/gopro-dashboard.py#L291)
  <details><summary>Output</summary>

  ```
  289 |                     )
  290 |             ).open(args.map_style) as renderer:
  291 | 
  292 |                 if args.profiler:
  293 |                     profiler = WidgetProfiler()
  ```
  </details>

- **Static code check:** Frame `bin/gopro-dashboard.py:291` in `&lt;lambda&gt;` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/bin/gopro-dashboard.py#L291)
  <details><summary>Output</summary>

  ```
  289 |                     )
  290 |             ).open(args.map_style) as renderer:
  291 | 
  292 |                 if args.profiler:
  293 |                     profiler = WidgetProfiler()
  ```
  </details>

- **Static code check:** Frame `gopro_overlay/layout.py:106` in `draw` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/layout.py#L106)
  <details><summary>Output</summary>

  ```
  104 |         self._entry = self.framemeta.get(pts)
  105 |         return self.scene.draw(image)
  106 | 
  ```
  </details>

- **Static code check:** Frame `gopro_overlay/widgets/widgets.py:231` in `draw` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/widgets/widgets.py#L231)
  <details><summary>Output</summary>

  ```
  229 |     def drawing_frame(self) -> Image:
  230 |         raise NotImplementedError()
  231 | 
  232 | 
  233 | class SimpleFrameSupplier(FrameSupplier):
  ```
  </details>

- **Static code check:** Frame `gopro_overlay/widgets/widgets.py:27` in `draw` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/widgets/widgets.py#L27)
  <details><summary>Output</summary>

  ```
  25 | class Composite(Widget):
  26 | 
  27 |     def __init__(self, *widgets):
  28 |         self.widgets = widgets
  29 | 
  ```
  </details>

- **Static code check:** Frame `gopro_overlay/widgets/widgets.py:145` in `draw` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/widgets/widgets.py#L145)
  <details><summary>Output</summary>

  ```
  143 |     def __init__(self, at: Coordinate, widget):
  144 |         self.at = at
  145 |         self.widget = widget
  146 | 
  147 |     def draw(self, image: Image, draw: ImageDraw):
  ```
  </details>

- **Static code check:** Frame `gopro_overlay/widgets/widgets.py:27` in `draw` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/widgets/widgets.py#L27)
  <details><summary>Output</summary>

  ```
  25 | class Composite(Widget):
  26 | 
  27 |     def __init__(self, *widgets):
  28 |         self.widgets = widgets
  29 | 
  ```
  </details>

- **Static code check:** Frame `gopro_overlay/widgets/text.py:36` in `draw` matches the code. [code](https://github.com/time4tea/gopro-dashboard-overlay/blob/034342e790a87bff2bce697123e4fc1204348f63/gopro_overlay/widgets/text.py#L36)
  <details><summary>Output</summary>

  ```
  34 | 
  35 |         if cached is None:
  36 |             x0, y0, x1, y1 = self.font.getbbox(
  37 |                 text=text,
  38 |                 stroke_width=self.stroke_width,
  ```
  </details>

**What is missing:**

- 1 of 9 trace frames are at different lines than at 034342e (1 frame outside the repository was skipped); the report is probably from another version. Ask for the exact version or commit.

---
Generated by Pramaan at 2026-10-31T20:42:03.430Z using gemma4:e2b-it-qat. Verdicts come from code checks, not from the model.
