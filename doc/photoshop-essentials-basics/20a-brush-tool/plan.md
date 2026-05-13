# 20a Brush Tool Plan

## Goal

Complete the Brush basics workflow around the existing Viewport paint path: cursor feedback, Options Bar brush modes, temporary eyedropper / erase gestures, right-click brush sizing, Clear-mode erasing, and undoable strokes.

## Implementation

1. Wire the Brush Options Bar mode dropdown to the shared brush options store.
2. Map Brush mode choices into the active Viewport paint engine.
3. Add Clear mode support to both the Viewport path and registered brush tool path.
4. Add `Shift+Alt+R` and `Shift+Alt+N` Brush mode shortcuts.
5. Add `~` temporary erase behavior, including Background-layer background-color painting.
6. Replace the Brush/Eraser crosshair with a size-aware brush-tip cursor.
7. Toggle a precise cursor with Caps Lock.
8. Make temporary Alt/Option Brush eyedropper sample foreground color and restore the previous tool.
9. Commit brush / eraser stroke buffers as document history actions.
10. Add a right-click canvas Brush picker for Size and Hardness.
11. Add regression tests for the contract-critical shortcuts, controls, cursor, sampling, erasing, and undo behavior.

## Acceptance

- Brush mode changes in the Options Bar affect painting.
- `Shift+Alt+R` selects Clear mode and `Shift+Alt+N` returns to Normal.
- Clear mode erases pixels on normal layers and creates an undoable history step.
- `~` temporarily erases while Brush is active.
- Alt/Option temporarily samples foreground color with Eyedropper and returns to Brush on release.
- Brush cursor reflects Size / Hardness / Zoom, and Caps Lock switches to precise cursor.
- Right-clicking while Brush or Eraser is active opens Size and Hardness controls.

## Tests

- `src/test/20a-brush-tool.test.tsx`
- Focused paint regressions:
  - `src/test/paintModifiersSliceC.test.tsx`
  - `src/test/brushEngine.test.ts`
  - `src/test/brushSettings.test.ts`
  - `src/test/paint.test.ts`
  - `src/test/brushSmoothing.test.ts`

## Divergences

- HUD brush / color picker overlays are deferred.
- Right-click picker is a compact Size / Hardness picker, not the full Photoshop Brush Preset Picker.
