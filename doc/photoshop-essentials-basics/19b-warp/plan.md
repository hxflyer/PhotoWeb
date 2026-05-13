# 19b Warp Plan

## Goal

Complete the Enhanced Warp workflow around the existing mesh engine: content-bounds invocation, Free Transform handoff, richer grid controls, split lines, local mesh undo, and undoable document commit.

## Implementation

1. Route all Warp entry points through one `startWarp` helper.
2. Crop the active layer to visible content bounds for the Warp source and preview that crop back into the full-layer snapshot.
3. Add locked-layer protection to Warp.
4. Add a Warp button to Free Transform's on-canvas options strip.
5. Generalize mesh utilities from a fixed 4-by-4 point grid to variable point counts.
6. Rebuild `WarpOverlay` controls for presets, grid presets, custom grids, split buttons, reset, commit, and cancel.
7. Add point selection and selected-point move/scale/rotate behavior.
8. Keep active Warp mesh undo local with `Cmd/Ctrl+Z`.
9. On commit, record a history action using full-layer before/after image snapshots.

## Acceptance

- `Edit > Transform > Warp` and `Cmd/Ctrl+Shift+T` open Warp on the active content bounds.
- `Cmd/Ctrl+T`, then the Warp button, switches from Free Transform to Warp.
- Grid presets and Custom change the number of control points.
- Split buttons insert new interior grid lines and points.
- Dragging a control point changes the preview.
- Commit records undo/redo history.
- Cancel restores the original pixels.
- Locked layers do not enter Warp.

## Tests

- `src/test/19b-warp.test.tsx`
- Existing utility coverage:
  - `src/test/remaining.test.ts`

## Divergences

- Smart Object editable Warp is not implemented; Warp is destructive to pixels.
- Pixel output is deterministic mesh resampling, not Photoshop-private Bezier interpolation.
