# 20a Brush Tool Gap Report

Cluster: `20a-brush-tool`

Lessons:
- `brush-dynamics-intro`
- `photoshop-brush-tool-hidden-tips-tricks`
- `turn-a-photoshop-brush-into-an-eraser`

## Photoshop Contract

- `B` selects Brush; `Shift+B` cycles paint-family tools.
- The Brush cursor can show a brush-tip outline or switch to a precise cursor with Caps Lock.
- Options Bar exposes Brush Mode, Size, Hardness, Opacity, Flow, and smoothing.
- `[` / `]` resize the brush; `Shift+[` / `Shift+]` adjust hardness.
- Number keys adjust opacity; `Shift` + number keys adjust flow.
- Right-click on the canvas opens a brush picker for Size and Hardness.
- Alt/Option temporarily switches Brush to Eyedropper and samples the foreground color.
- Brush Mode can be set to Clear, making Brush erase transparency on normal layers.
- `Shift+Alt+R` selects Clear mode and `Shift+Alt+N` returns to Normal.
- Holding `~` temporarily erases while painting; on Background layers it paints with the background color.

## Existing Photoweb State

- Brush settings already stored size, hardness, opacity, flow, smoothing, and bracket / number shortcuts.
- Brush and Eraser painting used the active Viewport paint path, while `tools/brush.ts` held a newer registry implementation.
- The Options Bar Brush mode dropdown was visually present but not wired to painting.
- The active brush cursor was a generic crosshair rather than a size-aware brush tip.
- Alt/Option temporary eyedropper sampled the secondary color because the standalone Eyedropper treats Alt as background sampling.
- Brush strokes did not consistently record undo history through the Viewport stroke buffer.
- Right-click on canvas exposed selection/free-edit commands only.

## Implemented Work

- Wired Brush Mode to the active painting path with Normal, Multiply, and Clear.
- Added Clear-mode erasing for normal raster layers, with Clear disabled / ignored on Background layers.
- Added `Shift+Alt+R` and `Shift+Alt+N` Brush mode shortcuts.
- Added `~` temporary erasing; on Background layers it paints with the secondary/background color.
- Added a scalable brush-tip cursor using brush size, hardness, and zoom.
- Added Caps Lock precise cursor toggling.
- Fixed temporary Alt/Option Brush eyedropper sampling so it updates foreground color and restores Brush on release.
- Added undoable brush, eraser, and Clear strokes from the active Viewport stroke buffer.
- Added a compact right-click Brush picker with Size and Hardness sliders.
- Added Options Bar test hooks for the Brush controls.
- Taught the brush engine a Multiply blend path for active Viewport painting.
- Updated the registered brush tool path so `mode: "clear"` maps to `destination-out`.

## Verification

- `src/test/20a-brush-tool.test.tsx` covers bracket and hardness shortcuts, Brush mode wiring and shortcuts, brush cursor / Caps Lock, temporary eyedropper sampling, Clear-mode undoable erasing, and right-click brush picker.
- Focused paint regression coverage passed:
  - `src/test/paintModifiersSliceC.test.tsx`
  - `src/test/brushEngine.test.ts`
  - `src/test/brushSettings.test.ts`
  - `src/test/paint.test.ts`
  - `src/test/brushSmoothing.test.ts`

## Divergences

- Photoweb does not implement Photoshop's transient HUD brush or HUD color picker overlays in this tick.
- Photoweb offers a compact right-click Size/Hardness picker, not Photoshop's full preset browser.
