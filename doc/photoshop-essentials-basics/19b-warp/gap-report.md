# 19b Warp Gap Report

Cluster: `19b-warp`

Lesson:
- `warp-images-with-the-enhanced-warp-tool-in-photoshop-cc-2020`

## Photoshop Contract

- `Edit > Transform > Warp` enters Warp directly on the active editable layer.
- Free Transform exposes a Warp icon in the Options Bar to switch into Warp.
- The default Warp box appears around the layer contents.
- Users can drag control points, choose Warp presets, reset the active warp, commit with Enter/checkmark, and cancel with Esc/cancel.
- Enhanced Warp exposes grid presets (`3 x 3`, `4 x 4`, `5 x 5`) and a Custom grid size.
- Split controls add vertical, horizontal, or crosswise grid divisions.
- Shift-click and Shift-drag select multiple control points; selected points can move, scale, and rotate together.
- Active Warp supports local undo of mesh edits, while commit creates a document history step.

## Existing Photoweb State

- `Edit > Transform > Warp` and `Cmd/Ctrl+Shift+T` opened a basic fixed 4-by-4 control-point overlay.
- Warp preview mutated layer pixels live, but commit only closed the overlay and did not record undoable history.
- Warp operated on the whole layer canvas rather than the visible content bounds.
- Menu-triggered Warp did not share the locked-layer guard.
- The mesh engine only accepted a fixed 4-by-4 control-point layout.
- Free Transform did not expose an on-overlay Warp switch.

## Implemented Work

- Added a shared content-bounds `startWarp` path with locked-layer protection.
- Added an Options Bar Warp button inside Free Transform that switches into Warp.
- Made Warp commits undoable by storing full-layer before/after snapshots in history.
- Changed cancel to restore the original snapshot after live preview edits.
- Generalized `applyMeshWarp` and `warpPresetControlPoints` to variable grid sizes.
- Rebuilt the Warp overlay with:
  - default, `3 x 3`, `4 x 4`, `5 x 5`, and custom grids;
  - preset dropdown;
  - reset button;
  - split crosswise, vertical, and horizontal controls;
  - Alt/Option-click auto split;
  - Shift-click and Shift-drag multi-point selection;
  - multi-point move, scale, and rotate controls;
  - local `Cmd/Ctrl+Z` mesh-step undo;
  - context menu removal for custom interior split rows/columns.

## Verification

- `src/test/19b-warp.test.tsx` covers shortcut entry, Free Transform to Warp switching, grid/split controls, locked-layer refusal, cancel restore, and undo/redo after commit.
- Existing mesh utility coverage remains in `src/test/remaining.test.ts`.

## Divergences

- Photoweb applies Warp destructively to layer pixels. Photoshop can keep Warp editable on Smart Objects.
- Photoweb uses deterministic browser-local mesh resampling rather than Photoshop's exact Bezier and rasterization engine.
