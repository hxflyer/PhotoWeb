# 054 drawing-custom-shapes-with-the-shapes-panel-in-photoshop-cc-2020
- Lesson path: `doc/photoshop-essentials-basics/drawing-custom-shapes-with-the-shapes-panel-in-photoshop-cc-2020/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 27a-custom-shape-tool

## Lesson Expectations
- Custom Shape Tool under shape tools; Options Bar Custom Shape Picker, Tool Mode set to Shape, Fill/Stroke controls, shape groups.
- Shapes panel can browse groups and drag/drop or choose shapes; Photoshop 2020 has more hidden shape libraries.
- Combine/merge shapes and save result as a custom shape preset.
- Screenshots grounding UI: `2022-draw-custom-shapes-select-custom-shape-tool-photoshop-52eecdc8.png`, `2022-draw-custom-shapes-photoshop-custom-shape-picker-fadf5461.png`, `2022-draw-custom-shapes-shapes-panel-photoshop-7ab7bb49.png`, `2022-draw-custom-shapes-combine-shapes-photoshop-3d2b3359.png`.

## Photoweb Coverage
- Shape Options Bar exposes Tool Mode, operation buttons, Fill, Stroke, stroke width, and radius/sides fields in `src/components/Panels/OptionsBar.tsx:2187`.
- Shapes panel renders grouped custom shape presets and supports click, double-click add, and drag data in `src/components/Panels/ShapesPanel.tsx:40`.
- Built-in shape groups include defaults, arrows, banners, and animals in `src/tools/customShapes.ts:100`.
- Tests cover grouped default sets, picker loading, panel selection/add, and undoable layer creation in `src/test/27a-custom-shape-tool.test.tsx:41`.

## Gaps / Mismatches
- Photoshop's full 2020 shape libraries are not present; Photoweb has a curated set.
- The legacy `All`/Append flow from Photoshop's picker is not applicable.
- Shape combine/merge exists in broader shape code, but this specific report did not verify parity with every combine-path step in the lesson.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action unless the product wants a larger built-in shape library.

