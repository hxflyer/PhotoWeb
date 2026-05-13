# 19a Free Transform Plan

## Goal

Complete the Free Transform contract without duplicating the already-working overlay: keep the existing handle/modifier behavior, fix the command-path mismatch, and make committed raster/type transforms undoable.

## Implementation

1. Reuse `startFreeTransform` for `Cmd/Ctrl+T`.
2. Put the locked/background-layer guard in `startFreeTransform` so menu and shortcut invocation match.
3. Preserve the existing `Edit > Free Transform`, Options Bar check/cancel, Enter/Esc, and right-click transform menu behavior.
4. Preserve current modifier modes:
   - Shift corner drag constrains aspect ratio.
   - Alt/Option scales from center.
   - Shift rotation snaps to 15-degree increments.
   - Cmd/Ctrl corner drag distorts.
   - Cmd/Ctrl+Shift side drag skews.
   - Cmd/Ctrl+Alt/Option+Shift corner drag applies perspective.
5. On commit, record raster/type canvas snapshots and type data in history, matching the existing shape-transform history behavior.
6. Add regression coverage for undo/redo after a raster transform commit.

## Acceptance

- `Cmd/Ctrl+T` and menu invocation open the same content-bounds transform box.
- Committing a raster transform moves pixels and creates an undo entry.
- Undo restores the original pixels; redo reapplies the committed transform.
- Locked layers do not enter Free Transform.
- Existing modifier-driven transform tests remain green.

## Tests

- `src/test/19a-free-transform.test.tsx`
- Existing focused coverage:
  - `src/test/freeTransformModifiers.test.tsx`
  - `src/test/freeTransformSliceE.test.tsx`
  - `src/test/batch8Polish.test.tsx`

## Divergences

- Photoshop CC 2019+ uses proportional scaling by default; photoweb keeps legacy Shift-to-constrain scaling because two source lessons and older Photoshop muscle memory teach that behavior.
