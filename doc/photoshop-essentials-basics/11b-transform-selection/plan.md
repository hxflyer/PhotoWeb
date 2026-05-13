# Plan — 11b Transform Selection

## Goals

### Feature spec: Transform Selection invocation parity

**What it does** — Users can open Transform Selection from `Select > Transform Selection` or by right-clicking inside an active selection and choosing `Transform Selection`.

**Photoshop habit preserved** — `transform-selection` shows `Select > Transform Selection` in `2022-transform-selection-photoshop-transform-selection-command-c66c0243.png` and the right-click command in `2022-transform-selection-choose-transform-selection-from-menu-13073bf0.jpg`.

**Invocation** — Select menu command; selection context menu command.

**Pre-conditions** — An active selection exists. The Select menu item is disabled without a selection; the context menu entry appears only while a selection is active.

**Interaction choreography**
1. User creates a selection outline.
2. User chooses `Select > Transform Selection`, or right-clicks inside the selection and chooses `Transform Selection`.
3. The transform box appears around the selection outline.

**Visual feedback** — The transform rectangle and handles appear around the selection outline, matching `2022-transform-selection-drag-handle-to-resize-selection-outline-ca85782b.jpg`.

**Post-conditions** — No pixels are changed by opening the command. The overlay stays active until commit/cancel.

**Edge cases** — With no selection, the Select menu command is disabled and no context menu command appears.

### Feature spec: Linked resize, Shift unlock, Alt center, and rotation snap

**What it does** — Transform Selection handle dragging resizes the outline, not the layer pixels. Width and height are linked by default; holding `Shift` unlocks the ratio while dragging. Holding `Alt/Option` resizes from center. Holding `Shift` while rotating snaps to 15 degree increments.

**Photoshop habit preserved** — The linked W/H contract is grounded in `2022-transform-selection-width-height-link-icon-91ea3a06.png`; Shift unlock is grounded in `2022-transform-selection-resize-selection-outline-aspect-ratio-unclocked-9b50710e.jpg`; rotation snap is described under "How to rotate the selection outline".

**Invocation** — Drag any transform handle; drag inside to move; drag rotate handle; use `Shift` or `Alt/Option` during the drag.

**Pre-conditions** — Transform Selection overlay is active and a selection mask snapshot exists.

**Interaction choreography**
1. User drags a corner or side handle.
2. With no modifier, W/H stay linked.
3. With `Shift`, W/H unlock for that drag.
4. With `Alt/Option`, the selection resizes from its center.
5. Dragging the rotate handle rotates continuously; adding `Shift` snaps to 15 degree increments.

**Visual feedback** — The bounding box updates live; the committed marching ants follow the transformed mask.

**Post-conditions** — Commit writes a single transformed mask operation through `setSelectionOperations`; layer pixels are unchanged.

**Edge cases** — Dimensions clamp to at least 1 px; empty transformed masks clear the selection.

### Feature spec: Options Bar-style readouts and commit/cancel

**What it does** — Transform Selection displays a top control strip with X, Y, W, and H numeric fields, a linked W/H toggle, icon-only commit and cancel buttons, and Enter/Escape keyboard commit/cancel.

**Photoshop habit preserved** — Readouts and link icon are grounded in `2022-transform-selection-width-height-link-icon-91ea3a06.png`; checkmark commit is grounded in `2022-transform-selection-transform-selection-checkmark-6a8c1a3d.png`.

**Invocation** — Type numeric values into X/Y/W/H; click link/unlink; click checkmark or press Enter to commit; click X or press Escape to cancel.

**Pre-conditions** — Transform Selection overlay is active.

**Interaction choreography**
1. The top strip appears with current selection bounds.
2. User edits X/Y/W/H; linked W/H preserves proportion when W or H changes.
3. User clicks checkmark or presses Enter to commit, or clicks X / presses Escape to cancel.

**Visual feedback** — Numeric fields update from live drag state, and check/cancel controls stay in a predictable top strip.

**Post-conditions** — Commit stores the transformed selection; cancel closes without changing the original selection operation stack.

**Edge cases** — Invalid numeric input falls back to zero for X/Y and clamps W/H to 1 px.

## Out-of-scope-this-tick
- Skew, Distort, Perspective, and Warp submodes are deferred to the transform/warp clusters because they need distinct mode state and handle semantics.
- Converting the transformed selection into a layer mask and completing the solid-color background effect is deferred to the layer mask/fill layer clusters.

## Files to edit / files to create
- `src/components/Canvas/Viewport.tsx` — add context menu `Transform Selection`.
- `src/components/layout/MenuBar.tsx` — disable menu command when there is no active selection.
- `src/components/Canvas/TransformSelectionOverlay.tsx` — linked resize, Shift/Alt modifiers, rotation snapping, readouts, link toggle, icon commit/cancel.
- `src/test/11b-transform-selection.test.tsx` — simulator/UI tests for invocation, resize semantics, readouts, and cancel behavior.

## Test cases
- Right-clicking an active selection exposes and opens `Transform Selection`.
- Dragging a corner handle keeps the aspect ratio linked by default.
- Holding `Shift` while dragging unlocks the linked aspect ratio.
- Editing the linked W readout resizes H proportionally.
- `Escape` cancels without changing the original selection.

## Divergences from Photoshop
- Photoshop supports Skew, Distort, Perspective, and Warp from the Transform Selection context menu; photoweb defers those submodes because correct geometry belongs with the broader transform/warp clusters.

## Stop conditions specific to this cluster
- Stop if transform mode requires changing selection rasterization or compositor architecture.
- Stop if adding advanced warp/skew modes would push the edit beyond the command-invocation and basic transform contract.
