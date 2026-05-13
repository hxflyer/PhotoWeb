# Plan — 11a Selections Overview

## Goals

### Feature spec: Options Bar selection operation modes

**What it does** — The New, Add, Subtract, and Intersect icons in the Options Bar become live Photoshop-style operation modes. Clicking one sets the default operation for the next selection gesture; keyboard modifiers still override it while held.

**Photoshop habit preserved** — `basic-selections` shows the four icons in `photo-editing-basic-selections-options-bar-94097c33.gif` and labels Add / Subtract / Intersect in `photo-editing-basic-selections-add-to-icon-6f716e11.gif`, `photo-editing-basic-selections-subtract-option-2afdebdb.gif`, and `photo-editing-basic-selections-intersect-option-c281ce9f.gif`.

**Invocation** — Options Bar icons for marquee, lasso, Magic Wand, and Quick Selection tools; temporary `Shift` Add, `Alt/Option` Subtract, `Shift+Alt/Option` Intersect.

**Pre-conditions** — A selection tool is active. With no existing selection, Add and Intersect create a fresh selection where possible; Subtract from no selection leaves no selection.

**Interaction choreography**
1. User selects a selection tool from the Toolbar or shortcut group.
2. User clicks an operation icon in the Options Bar; the icon becomes active.
3. User drags or clicks with the tool; the active operation is applied unless a modifier key overrides it at mouse-down.
4. User can release a modifier after mouse-down without changing the operation for that gesture.

**Visual feedback** — Active Options Bar state mirrors the selected icon family from `photo-editing-basic-selections-options-bar-94097c33.gif`.

**Post-conditions** — Selection history records the resulting `Set Selection` or `Add Selection` document command through the existing store actions.

**Edge cases** — Existing-selection inside-click still moves only when the effective operation is New. In Add/Subtract/Intersect mode, inside-click begins a modifying selection gesture instead.

### Feature spec: Modifier-start operation capture and cursor badges

**What it does** — All registered selection tools resolve the operation from the modifier state at pointer-down. `Shift`, `Alt/Option`, and `Shift+Alt/Option` show plus, minus, and x cursor badges on marquee, lasso, Magic Wand, and Quick Selection tools.

**Photoshop habit preserved** — `basic-selections` states the user only needs to hold the modifier before starting the selection; cursor references are grounded in `photo-editing-basic-selections-plus-sign-5cf2f968.gif`, `photo-editing-basic-selections-minus-sign-8131ec01.gif`, and `photo-editing-basic-selections-intersect-with-275f89ce.gif`.

**Invocation** — Hold `Shift` before drag/click for Add, `Alt/Option` before drag/click for Subtract, or `Shift+Alt/Option` before drag/click for Intersect.

**Pre-conditions** — A selection tool is active. Intersect needs an existing selection to produce an overlap; if there is none, photoweb treats it as a fresh region, matching existing helper behavior.

**Interaction choreography**
1. User holds the modifier key(s); the cursor badge changes immediately.
2. User presses mouse down; photoweb captures the effective operation.
3. User may release the modifier key(s) mid-gesture.
4. On mouse-up or polygon commit, the captured operation is applied.

**Visual feedback** — Committed selections show marching ants like `why-make-selections/images/selections-why-photoshop-selection-outline-3d297025.jpg`; the operation cursor badge matches the `basic-selections` screenshots.

**Post-conditions** — Add appends an add op, Subtract appends a subtract op when a selection exists, and Intersect replaces the op stack with a raster overlap mask.

**Edge cases** — Polygonal Lasso captures the operation on the first point and keeps `Shift` available for segment angle snapping on later points.

### Feature spec: Select menu command parity

**What it does** — `Select > Reselect` calls the existing `reselect()` action, and Inverse Selection uses the Photoshop shortcut `Cmd/Ctrl+Shift+I`.

**Photoshop habit preserved** — `why-make-selections` uses `Ctrl/Cmd+H` for hiding selection edges; `basic-selections` reinforces Select menu selection vocabulary. Photoshop's Select menu command names remain `All`, `Deselect`, `Reselect`, and `Inverse`.

**Invocation** — `Select > All`, `Cmd/Ctrl+A`; `Select > Deselect`, `Cmd/Ctrl+D`; `Select > Reselect`, `Cmd/Ctrl+Shift+D`; `Select > Inverse`, `Cmd/Ctrl+Shift+I`.

**Pre-conditions** — Reselect needs a previously cleared selection snapshot; otherwise the command is disabled/no-op.

**Interaction choreography**
1. User clears a selection with menu or shortcut.
2. User chooses `Select > Reselect` or presses `Cmd/Ctrl+Shift+D`.
3. The prior marching-ants selection returns.
4. User presses `Cmd/Ctrl+Shift+I` or chooses `Select > Inverse`; the selection flips against the document bounds.

**Visual feedback** — Marching ants disappear on Deselect and return on Reselect.

**Post-conditions** — Selection store preserves `lastCleared` for reselect and records selection commands via existing history.

**Edge cases** — `Cmd/Ctrl+Option/Alt+I` remains Image Size and is checked before Inverse Selection.

## Out-of-scope-this-tick
- Detailed marquee geometry behaviors like Space-drag reposition, Fixed Ratio, Fixed Size, and full anti-alias controls are deferred to `12-marquee`.
- Magnetic Lasso behavior is deferred to `13-lasso`.
- Object Selection and richer Magic Wand / Quick Selection behavior are deferred to `14a-content-selection-tools`.

## Files to edit / files to create
- `src/tools/selectionModifiers.ts`, `src/components/Panels/OptionsBar.tsx` — Options Bar operation state.
- `src/tools/selectionMove.ts`, `src/tools/lasso.ts`, `src/tools/magicWand.ts`, `src/tools/quickSelection.ts` — effective operation capture.
- `src/components/Canvas/Viewport.tsx` — plus/minus/intersect cursor badges for registered selection tools.
- `src/App.tsx`, `src/components/layout/MenuBar.tsx` — Select command parity.
- `src/test/11a-selections-overview.test.tsx` — simulator/tool/UI tests for this cluster.

## Test cases
- Clicking the Options Bar Add icon makes the next marquee gesture add without holding `Shift`.
- `Alt/Option` subtract is captured at mouse-down and survives releasing Alt before mouse-up.
- Lasso `Shift` add is captured at mouse-down and survives releasing Shift before mouse-up.
- `Shift+Alt/Option` shows the intersect cursor on a registered selection tool.
- Existing selection tests for marquee, lasso, Magic Wand, Quick Selection, and true intersection remain green.

## Divergences from Photoshop
- None.

## Stop conditions specific to this cluster
- Stop if selection operation state leaks across tests or tools in a way that breaks plain New Selection.
- Stop if cursor changes require a larger cursor asset system beyond the existing inline SVG cursor pattern.
- Stop if enabling `Select > Reselect` requires a MenuBar subscription rewrite outside the cluster scope.
