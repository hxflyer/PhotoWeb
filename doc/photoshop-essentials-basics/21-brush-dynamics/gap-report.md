# 21 Brush Dynamics Gap Report

Cluster: `21-brush-dynamics`

## Lessons Reviewed

- `shape-dynamics` — Brushes panel category controls dynamic brush size, angle, and roundness with jitter and Control sources.
- `scattering` — Scattering offsets repeated brush-tip stamps, supports Both Axes, Count, Count Jitter, and Control.
- `texture` — Texture applies a pattern through each brush tip with mode, scale, depth, minimum depth, jitter, invert, and Texture Each Tip.
- `dual-brush` — Dual Brush combines a primary tip with a secondary tip using diameter, spacing, scatter, count, flip, and blend modes.
- `color-dynamics` — Color Dynamics varies foreground/background mixing, hue, saturation, brightness, and purity.
- `other-dynamics` — Other Dynamics controls opacity and flow jitter/control, distinct from Options Bar Opacity and Flow caps.

## Current Photoweb Coverage

- Brush/Eraser painting already flows through the Viewport stroke buffer and single undo commit in [Viewport.tsx](../../../src/components/Canvas/Viewport.tsx#L1023).
- Brush dabs are rendered by [brushEngine.ts](../../../src/utils/brushEngine.ts#L42), including round tips, custom tips, flow, opacity cap, selection masks, and erase mode.
- The Brushes panel existed as presets/groups/new preset UI in [BrushPresetsPanel.tsx](../../../src/components/Panels/BrushPresetsPanel.tsx#L45), but had no Brush Settings tab or dynamics categories.
- Brush Options Bar controls already covered basic size/hardness/opacity/flow/mode/spacing through existing brush settings and tool options.

## Gaps

- No Brushes panel `Brush Settings` surface with selectable dynamics categories.
- No per-stamp dynamics resolver for Shape Dynamics, Scattering, Color Dynamics, or Other Dynamics.
- No texture/dual-brush alpha modulation in the brush engine.
- No stroke dab index, so Fade controls could not work across a continuous stroke.
- No tests proving panel controls alter brush dynamics or that enabled dynamics affect real canvas pixels.

## Photoshop-Habit Mismatches

- Photoshop users click the category words, not only the checkbox, to see options; this is grounded by `photoshop-brushes-brush-dynamics-photoshop-shape-dynamics-c7d99d6d.gif`. Photoweb had only preset rows.
- Shape Dynamics expects Size/Angle/Roundness Jitter plus Control dropdowns, grounded by `photoshop-brushes-brush-dynamics-shape-dynamics-options-d1ce4df6.gif`.
- Scattering expects Scatter, Both Axes, Count, Count Jitter, and Control, grounded by `brush-dynamics-scattering-photoshop-scattering-options-*.gif` screenshots in the lesson.
- Texture expects pattern/mode/scale/depth/invert/Texture Each Tip style controls, grounded by the `texture` lesson screenshots for the Texture tab and pattern picker.
- Dual Brush expects a secondary-brush options panel with diameter, spacing, scatter, count, flip, and modes, grounded by the `dual-brush` lesson screenshots.
- Color Dynamics expects Foreground/Background Jitter, Hue/Saturation/Brightness Jitter, and Purity, grounded by the `color-dynamics` lesson screenshots.
- Other Dynamics expects Opacity and Flow Jitter/Control in the Brushes panel while Options Bar Opacity/Flow remain caps, grounded by `brush-dynamics-other-dynamics-photoshop-opacity-flow-e472a002.gif`.

## UI / UX Issues

- The Brushes panel could not switch between presets and settings, so the user had no Photoshop-like place to discover dynamics.
- Dynamic controls needed stable labels and compact slider/select rows to fit the existing side-panel density.

## Implemented Work

- Added a `Brush Settings` tab to the Brushes panel and six Photoshop-named dynamics sections in [BrushDynamicsControls.tsx](../../../src/components/Panels/BrushDynamicsControls.tsx).
- Added brush dynamics state, defaults, patching, deterministic per-dab resolution, color variation, scatter generation, and alpha masks in [brushDynamics.ts](../../../src/utils/brushDynamics.ts#L1).
- Added texture and dual-brush alpha modulation to the round/custom dab engine in [brushEngine.ts](../../../src/utils/brushEngine.ts#L1).
- Added a `dabIndex` to the Viewport stroke buffer and routed Brush/Eraser dabs through dynamic resolution in [Viewport.tsx](../../../src/components/Canvas/Viewport.tsx#L1048).
- Added focused coverage in [21-brush-dynamics.test.tsx](../../../src/test/21-brush-dynamics.test.tsx).

## Verification

- `npx tsc -b`
- `npm run lint` — 16 existing warnings, 0 errors.
- Focused tests:
  - `src/test/21-brush-dynamics.test.tsx`
  - `src/test/brushEngine.test.ts`
  - `src/test/20b-brush-presets.test.tsx`
- Full suite: `npm test` — 166 files / 1241 tests.
- Dev server smoke test: `curl -I http://127.0.0.1:5173/` returned `200 OK`.

## Photoshop Divergences Worth Keeping

- Pen Pressure, Pen Tilt, and Stylus Wheel are exposed with Photoshop names, but browser mouse painting currently resolves them as full pressure unless pointer hardware pressure is available later.
- Angle and roundness controls are represented in UI/state for Photoshop familiarity, but the current round-tip engine only applies size/scatter/color/texture/opacity/flow effects visually.
- Texture patterns and Dual Brush masks use deterministic built-in procedural patterns rather than Photoshop's proprietary brush/pattern libraries.
