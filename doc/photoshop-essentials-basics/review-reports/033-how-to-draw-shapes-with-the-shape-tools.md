# 033 how-to-draw-shapes-with-the-shape-tools
- Lesson path: `doc/photoshop-essentials-basics/how-to-draw-shapes-with-the-shape-tools/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 26b-geometric-shapes

## Lesson Expectations
- Shape tools toolbar group, Options Bar reset/defaults, Tool Mode, Fill/Stroke, stroke size/type/alignment, W/H fields, Path Operations, path alignment/arrangement, gear options, corner radius, and drawing rectangles/ellipses/polygons/lines.
- Screenshots include `2022-shape-tools-photoshop-rectangle-tool-in-toolbar-64b09573.png`, `2022-shape-tools-shape-tool-mode-option-11ea63a3.png`, and `2022-shape-tools-shape-fill-color-choices-386ce68c.png`.

## Photoweb Coverage
- Shape tool model covers Shape/Path/Pixels, rectangle/rounded-rect/ellipse/triangle/polygon/line/custom, fill/stroke, polygon/star, line arrows, and combine modes (`src/tools/shapes.ts:27`, `src/tools/shapes.ts:31`, `src/tools/shapes.ts:40`, `src/tools/shapes.ts:47`).
- Options Bar exposes tool mode, fill/stroke, operations, polygon sides/star/smooth options, and line arrows (`src/components/Panels/OptionsBar.tsx:2136`, `src/components/Panels/OptionsBar.tsx:2188`, `src/components/Panels/OptionsBar.tsx:2253`, `src/components/Panels/OptionsBar.tsx:2323`).
- Properties panel edits live shape geometry (`src/components/Panels/PropertiesPanel.tsx:2024`, `src/test/shapeProperties.test.tsx:105`).

## Gaps / Mismatches
- Shape boolean operations can rasterize the active shape layer, which is weaker than Photoshop's fully editable vector path operations (`src/tools/shapes.ts:531`, `src/tools/shapes.ts:549`).
- Path Alignment/Arrangement parity is not clearly present in shape Options Bar.

## Scope Decision
Fix

## Recommended Follow-up
Decide whether rasterized boolean combines are acceptable; otherwise plan editable vector boolean/path-arrangement follow-up.
