# 031 how-to-draw-custom-shapes-in-photoshop
- Lesson path: `doc/photoshop-essentials-basics/how-to-draw-custom-shapes-in-photoshop/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 27a-custom-shape-tool

## Lesson Expectations
- Custom Shape Tool, shape picker/preset groups, Tool Mode set to Shape, fill/stroke color and stroke options, drag shape, Shift correct aspect ratio, Space reposition, then resize/rotate with Free Transform.
- Screenshots include `2022-draw-custom-shapes-select-custom-shape-tool-photoshop-52eecdc8.png`, `2022-draw-custom-shapes-photoshop-custom-shape-picker-fadf5461.png`, and `2022-draw-custom-shapes-tool-mode-option-shape-ff05aade.png`.

## Photoweb Coverage
- Toolbar includes Custom Shape Tool in the U shape group (`src/components/Panels/Toolbar.tsx:123`, `src/components/Panels/Toolbar.tsx:130`).
- Options Bar includes Shape/Path/Pixels modes, fill/stroke, operations, and Custom Shape picker menu (`src/components/Panels/OptionsBar.tsx:2136`, `src/components/Panels/OptionsBar.tsx:2188`, `src/components/Panels/OptionsBar.tsx:2038`).
- Built-in custom shape groups include star/heart and others; Shapes panel can select groups (`src/tools/customShapes.ts:100`, `src/components/Panels/ShapesPanel.tsx`, `src/test/27a-custom-shape-tool.test.tsx:52`, `src/test/27a-custom-shape-tool.test.tsx:64`).

## Gaps / Mismatches
- Photoweb's preset library is curated, not Photoshop's full legacy/custom-shape catalog.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
