# 22b Live Gradients Gap Report

Cluster: `22b-live-gradients`

## Lessons Reviewed

- `how-to-use-live-gradients-in-photoshop-2023` — Live Gradients use Options Bar `Gradient Mode = Gradient`, create an editable non-destructive `Gradient Fill` layer, expose on-canvas handles for scale/angle/position/midpoint/color stops, and offer Properties panel editing for style, angle, scale, reverse, dither, type, method, smoothness, colors, opacity, reset alignment, and save preset.

## Current Photoweb Coverage

- The Gradient Tool already had a live preview state with endpoint handles, Enter commit, Esc cancel, and click-off commit in [gradient.ts](../../../src/tools/gradient.ts#L118).
- Classic pixel painting already used the shared gradient renderer, selection clipping, opacity/mode, and five gradient types in [gradient.ts](../../../src/tools/gradient.ts#L304).
- Fill layers already existed through `addFillLayer`, `setLayerFillData`, and `paintFillLayer` in [fillLayer.ts](../../../src/core/fillLayer.ts#L19) and [layersSlice.ts](../../../src/store/layersSlice.ts#L1116).
- Options Bar had gradient type/preset/options controls but no `Gradient Mode` selector.

## Gaps

- No Options Bar Gradient Mode selector for `Gradient` vs `Classic Gradient`.
- The existing live behavior painted pixels on the active layer; it did not create a separate non-destructive `Gradient Fill` layer.
- Fill layer gradient data did not store drag start/end points, method, dither, or smoothness, so a live gradient could not round-trip the drawn line.
- Existing live endpoint handles only edited the pixel preview path, not fill-layer data.

## Photoshop-Habit Mismatches

- Photoshop's Options Bar includes `Gradient Mode`, grounded by `2023-live-gradients-gradient-mode-option-88e47bfb.png`; photoweb had no equivalent.
- Releasing a live gradient creates a separate `Gradient Fill` layer, grounded by `2023-live-gradients-new-gradient-fill-layer-2c80cd6b.png`; photoweb mutated the active pixel layer.
- Dragging color stops adjusts scale/angle, grounded by `2023-live-gradients-adjust-gradient-scale-on-canvas-controls-2ad63087.jpg` and `2023-live-gradients-rotate-gradient-angle-on-canvas-controls-b54f8613.jpg`; photoweb had endpoint handles but only for the pixel preview.

## UI / UX Issues

- The live-gradient mode could not be discovered or toggled from the Options Bar.
- Live edits were not represented as layer data, so a Photoshop user would lose the non-destructive expectation as soon as the gradient was applied.

## Implemented Work

- Added `gradientMode: 'classic' | 'gradient'` to Gradient Tool options, with a `Gradient Mode` select in the Options Bar.
- Kept `Classic Gradient` on the existing pixel/live-preview path.
- Added `Gradient` mode that creates a new `Gradient Fill` layer on release, leaving the original active layer untouched.
- Extended fill-layer gradient data with drag `start`/`end`, dither, method, and smoothness, and made `paintFillLayer` render those exact endpoints.
- Reused live endpoint handles to update the active Gradient Fill layer's stored endpoint and repaint non-destructively.

## Verification

- Focused:
  - `npx tsc -b`
  - `npx vitest run src/test/liveGradientSliceI.test.ts src/test/gradientEditor.test.tsx src/test/gradientOptions.test.ts src/test/propertiesPanel.test.tsx`
- Full:
  - `npx tsc -b`
  - `npm run lint` — 16 existing warnings, 0 errors.
  - `npm test` — 166 files / 1250 tests.
  - Dev server smoke test: `curl -I http://127.0.0.1:5173/` returned `200 OK`.

## Photoshop Divergences Worth Keeping

- Photoweb implements endpoint-handle editing for live Gradient Fill layers but does not yet implement midpoint diamonds, plus-hover color stop insertion, double-click color stop editing, or Properties-panel live-gradient controls.
- Photoweb stores exact line endpoints on the fill layer; Photoshop exposes angle/scale/position in Properties. The endpoint representation preserves the same rendered result inside the current renderer.
