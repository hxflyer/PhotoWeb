# 19a Free Transform Gap Report

Cluster: `19a-free-transform`

Lessons:
- `free-transform`
- `photoshops-free-transform-essentials`
- `transform-and-warp-images-with-free-transform-in-photoshop-cc-2019`

## Photoshop Contract

- `Edit > Free Transform` and `Cmd/Ctrl+T` enter Free Transform on the active editable layer.
- The active content shows a bounding box, eight handles, outside-box rotation, a center reference point, and an Options Bar with X/Y/W/H/rotation plus commit/cancel.
- Dragging inside moves; side handles scale one axis; corner handles scale both axes.
- Alt/Option scales from center; Shift snaps rotation to 15-degree increments.
- Cmd/Ctrl corner drag distorts, Cmd/Ctrl+Shift side drag skews, and Cmd/Ctrl+Alt/Option+Shift corner drag applies perspective.
- Right-click inside the box exposes rotate/flip commands.
- Enter/checkmark commits; Esc/cancel restores the pre-transform state.

## Existing Photoweb State

- The overlay already had eight handles, move, outside rotate, Shift rotation snap, Alt center-scale, Cmd/Ctrl distort, Cmd/Ctrl+Shift skew, Cmd/Ctrl+Alt/Option+Shift perspective, right-click rotate/flip commands, and Enter/Esc handling.
- `Edit > Free Transform` used the robust `startFreeTransform` path, which crops to content/type bounds.
- `Cmd/Ctrl+T` had a parallel path that transformed the whole layer canvas rather than the content bounds.
- Menu-triggered Free Transform did not share the locked-layer guard from the shortcut path.
- Shape commits were recorded in history, but raster/type Free Transform commits only mutated the layer via live preview and then closed, so undo/redo could not restore the pre-transform raster/type state.

## Implemented Work

- Routed `Cmd/Ctrl+T` through `startFreeTransform`, matching the menu path and using content/type bounds.
- Moved the locked/background guard into the shared `startFreeTransform` entry point.
- Added undoable raster/type Free Transform commits by snapshotting the pre-transform canvas/type data and committing the final live-preview canvas/type data to history.
- Added regression coverage for committing a raster transform, then undoing and redoing it.

## Verification

- Focused tests cover the new undo/redo behavior and the existing modifier-driven transform mechanics.

## Divergences

- Photoweb keeps the legacy Photoshop habit where Shift constrains corner scaling. Photoshop CC 2019+ scales proportionally by default and uses Shift to invert that behavior, but the older lessons in this cluster and much long-standing muscle memory teach Shift-to-constrain.
