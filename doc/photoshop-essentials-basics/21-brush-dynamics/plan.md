# 21 Brush Dynamics Plan

## Goals

### Feature: Brushes Panel Dynamics Categories

**What it does** — The Brushes panel gains a `Brush Settings` tab with six Photoshop-named dynamics categories. Each row has an enable checkbox and clickable category label, and the selected category shows its sliders, selects, and toggles.

**Photoshop habit preserved** — Users click category words such as `Shape Dynamics`, not only the checkbox, to view controls, grounded by `shape-dynamics/images/photoshop-brushes-brush-dynamics-photoshop-shape-dynamics-c7d99d6d.gif`.

**Invocation** — Open the Brushes panel, choose `Brush Settings`, click a category label, toggle its checkbox, then adjust sliders/selects.

**Pre-conditions** — No document is required to configure dynamics. Painting requires an editable pixel layer and Brush or Eraser active.

**Interaction choreography** — Click `Brush Settings`; the left category list remains visible. Clicking a category label selects that section. Clicking the checkbox only enables/disables the section. Sliders and selects update immediately and affect subsequent dabs.

**Visual feedback** — The selected category row is highlighted, enabled categories use main text color, disabled categories use muted text, matching the compact Brushes panel density shown in the lesson screenshots.

**Post-conditions** — Dynamics options are stored in the brush dynamics module; no pixels change until a stroke is painted.

**Edge cases** — Controls are clamped to safe ranges. Disabled sections remain editable but do not affect paint until enabled.

### Feature: Dynamic Brush Dabs

**What it does** — Brush/Eraser strokes resolve each stamp through Shape Dynamics, Scattering, Color Dynamics, and Other Dynamics. Size Fade/Jitter, scatter count/offset, foreground/background and HSB variation, opacity/flow fade, and jitter can all alter individual dabs.

**Photoshop habit preserved** — Fade operates in brush-tip "steps", Size Jitter randomizes stamps, Scattering spreads repeated tips, Color Dynamics varies colors per stamp, and Other Dynamics keeps Options Bar opacity/flow as caps, grounded by the `shape-dynamics`, `scattering`, `color-dynamics`, and `other-dynamics` lesson screenshots.

**Invocation** — Enable one or more dynamics categories, paint with Brush or Eraser normally.

**Pre-conditions** — Brush/Eraser is active, the layer is editable, opacity and flow are above zero, and lock/selection rules allow painting.

**Interaction choreography** — Mouse down creates a stroke buffer. Each stamp increments a dab index, resolves enabled dynamics, applies all resolved dabs live to the active layer preview, and mouse up commits one undoable `Brush Stroke`, `Eraser`, or `Brush Clear` history entry.

**Visual feedback** — Users see varied stamp size, scatter, color, opacity, and flow appear while painting.

**Post-conditions** — Undo removes the entire dynamic stroke as one action.

**Edge cases** — Selection masks still constrain Brush/Eraser dabs. Clear mode and locked-layer guards remain in force. Mouse input resolves pressure controls as full pressure.

### Feature: Texture And Dual Brush Alpha Masks

**What it does** — Texture and Dual Brush options modulate dab alpha before coverage is accumulated. Texture supports procedural checker/dots/paper patterns; Dual Brush gates the primary dab with a secondary procedural tip mask and Photoshop-named modes.

**Photoshop habit preserved** — Texture uses pattern, mode, scale, depth, invert, Texture Each Tip, minimum depth, and depth jitter vocabulary; Dual Brush uses diameter, spacing, scatter, count, flip, and mode vocabulary, grounded by the `texture` and `dual-brush` lesson screenshots.

**Invocation** — Enable `Texture` or `Dual Brush` in Brush Settings, adjust controls, paint with Brush or Eraser.

**Pre-conditions** — Same as Dynamic Brush Dabs; texture and/or dual brush section must be enabled.

**Interaction choreography** — During each dab, the engine computes the normal brush-tip alpha, multiplies it by texture/dual-brush alpha, applies flow, then accumulates coverage under the stroke opacity cap.

**Visual feedback** — Brush marks show patterned or broken-up alpha rather than solid round/custom stamps.

**Post-conditions** — The active layer contains the textured/dual-brush stroke and one history entry.

**Edge cases** — Custom brush tips also receive texture/dual-brush alpha modulation. Zero-depth or disabled sections fall back to normal brush alpha.

## Out-Of-Scope This Tick

- Exact Photoshop proprietary brush-tip rotation/roundness rendering.
- Hardware stylus pressure/tilt/wheel input beyond preserving the Photoshop control names.
- Importing Photoshop pattern or brush libraries for Texture/Dual Brush.

## Files To Edit / Files To Create

- `src/utils/brushDynamics.ts` — dynamics option types, defaults, mutation helpers, per-dab resolver, texture/dual alpha helpers.
- `src/utils/brushEngine.ts` — apply optional dynamics alpha to round and custom dabs.
- `src/components/Canvas/Viewport.tsx` — maintain dab index and route Brush/Eraser stamps through dynamic resolution.
- `src/components/Panels/BrushPresetsPanel.tsx` — add Brushes / Brush Settings tabs.
- `src/components/Panels/BrushDynamicsControls.tsx` — dynamics UI.
- `src/test/21-brush-dynamics.test.tsx` — panel, resolver, engine, and Viewport coverage.

## Test Cases

- Brush Settings tab exposes Photoshop-style dynamics categories and changing controls updates the dynamics options.
- Resolver creates multiple scattered dabs and applies size fade, color variation, opacity fade, and flow jitter.
- Texture and Dual Brush options reduce stamped alpha through the brush engine.
- Viewport painting with enabled Scattering produces real scattered pixels outside the base brush radius.

## Divergences From Photoshop

- Photoshop uses hardware tablet pressure/tilt/wheel; photoweb exposes those controls but mouse painting resolves them as full pressure because browser input hardware support is not wired yet.
- Photoshop rotates/rounds arbitrary tips for Angle/Roundness; photoweb records those controls but the current round-tip engine only renders visual changes for size/scatter/color/texture/opacity/flow because tip rotation needs a larger brush-renderer pass.
- Photoshop can use installed pattern/brush libraries; photoweb uses deterministic procedural texture and dual-brush masks because proprietary Adobe assets are unavailable.

## Stop Conditions Specific To This Cluster

- Stop if dynamics require replacing the stroke history model.
- Stop if exact Photoshop brush library import becomes necessary for basic Texture/Dual Brush behavior.
