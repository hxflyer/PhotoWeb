# 20c Paint Symmetry Plan

## Goals

### Feature: Paint Symmetry Options Bar Control

**What it does** — Brush, Pencil, and Eraser expose a Paint Symmetry control in the Options Bar with Photoshop mode names, segment count where needed, hide/show, off, and an `OK` commit button.

**Photoshop habit preserved** — The Options Bar butterfly menu and mode list match `how-to-use-paint-symmetry-in-photoshop-cc-2019`, grounded by `2019-paint-symmetry-paint-symmetry-butterfly-icon-aea96f79.png` and `2019-paint-symmetry-paint-symmetry-options-12410472.png`.

**Invocation** — Select Brush, Pencil, or Eraser; use the Options Bar `Symmetry` menu; choose a mode; press Enter or click `OK`.

**Pre-conditions** — A painting tool is active. No active document is required to choose the mode, but painting requires an editable layer.

**Interaction choreography** — Choosing a mode creates a pending blue path. Enter or `OK` commits it. `Hide Symmetry` hides only the path; painting remains mirrored. `Symmetry Off` disables mirroring.

**Visual feedback** — A blue path appears over the document, grounded by `2019-paint-symmetry-dual-axis-symmetry-path-d1541eab.png`.

**Post-conditions** — Active symmetry settings are stored in the tool slice; no document pixels change until the user paints.

**Edge cases** — Hidden symmetry still paints symmetrically. Pending paths do not mirror until committed.

### Feature: Mirrored Painting

**What it does** — Brush, Eraser, and Pencil duplicate each dab through the active symmetry mode so one gesture creates mirrored marks in the same undoable stroke.

**Photoshop habit preserved** — Painting once creates mirrored strokes as shown in `2019-paint-symmetry-paint-symmetry-dual-axis-1-2b6aa477.png` and `2019-paint-symmetry-radial-paint-symmetry-effect-photoshopcc2019-300b7e22.png`.

**Invocation** — Paint normally after committing a symmetry path.

**Pre-conditions** — Symmetry mode is not off, path is committed, and a Brush/Pencil/Eraser stroke is in progress.

**Interaction choreography** — User paints in one area; mirrored dabs appear live at the transformed positions. Mouseup commits one history entry.

**Visual feedback** — Mirrored pixels appear immediately on the active layer.

**Post-conditions** — Undo removes the whole mirrored stroke.

**Edge cases** — Duplicated points at the canvas center are de-duplicated. Selection masks still constrain Brush/Eraser dabs.

## Out-Of-Scope This Tick

- Transform handles for resizing/moving symmetry paths.
- Paths panel storage and switching between multiple symmetry paths.
- Exact Photoshop-private Wavy / Spiral path math.

## Files To Edit / Files To Create

- `src/store/types.ts`, `src/store/toolsSlice.ts` — symmetry state and actions.
- `src/components/Panels/OptionsBar.tsx` — Brush/Pencil/Eraser symmetry controls.
- `src/components/Canvas/Viewport.tsx` — path overlay and mirrored Brush/Eraser painting.
- `src/tools/pencil.ts` — mirrored Pencil painting.
- `src/utils/paintSymmetry.ts` — mode-to-point transforms.
- `src/test/20c-paint-symmetry.test.tsx` — regression coverage.

## Test Cases

- Options Bar Vertical symmetry creates a pending path; Enter commits; Brush paints mirrored pixels and one undoable stroke.
- Hide Symmetry hides the path but keeps the active mode.
- Pencil mirrors through the active Vertical symmetry path.

## Divergences From Photoshop

- Photoshop symmetry paths can be transformed; photoweb's path is visual and commit-gated but fixed to the canvas because the lesson states symmetry affects the full canvas regardless of path size.
- Photoshop stores multiple symmetry paths in the Paths panel; photoweb stores one active path because Paths-panel switching is separate from the painting contract.
- Photoshop's Wavy/Spiral path shapes are private; photoweb uses deterministic approximations.

## Stop Conditions Specific To This Cluster

- Stop if mirrored Brush/Eraser requires replacing the Viewport paint history model.
- Stop if Paths panel persistence becomes necessary to make basic painting work.
