# 010 how-to-draw-gradients-with-the-gradient-tool-in-photoshop
- Lesson path: `doc/photoshop-essentials-basics/how-to-draw-gradients-with-the-gradient-tool-in-photoshop/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 22a-gradient-tool-and-editor

## Lesson Expectations
- Select Gradient Tool, choose preset, load/reset gradient sets, foreground/background and foreground/transparent gradients, reverse, transparency, dither, five gradient styles, and Gradient Editor color/opacity stops.
- Screenshots include `gradients-essentials-photoshop-gradient-tool-a4c0d9ef.gif`, `gradients-essentials-photoshop-gradient-picker-8a98e410.gif`, and `gradients-essentials-reset-gradients-6fd927ee.gif`.

## Photoweb Coverage
- Gradient options include mode, type, reverse, dither, method, transparency, presets, and editor launch (`src/components/Panels/OptionsBar.tsx:1341`, `src/components/Panels/OptionsBar.tsx:1413`, `src/components/Panels/OptionsBar.tsx:1484`, `src/components/Panels/OptionsBar.tsx:1488`).
- Gradient renderer supports linear/radial/angle/reflected/diamond, midpoint diamonds, smooth/classic methods, dither, and selection clipping (`src/tools/gradient.ts:8`, `src/tools/gradient.ts:215`, `src/tools/gradient.ts:307`, `src/tools/gradient.ts:399`, `src/tools/gradient.ts:415`).
- Gradient Editor supports color/opacity stops, midpoint diamonds, smoothness, and saved presets (`src/components/Dialogs/GradientEditorDialog.tsx:154`, `src/test/gradientEditor.test.tsx:47`, `src/test/gradientMidpointBatchC.test.tsx:40`, `src/test/gradientSmoothnessBatchC.test.tsx:36`).

## Gaps / Mismatches
- Full Photoshop legacy gradient-set loading/replacement is not exhaustive; photoweb keeps a curated preset set plus custom presets.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
