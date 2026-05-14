# 063 custom-shape-tool
- Lesson path: `doc/photoshop-essentials-basics/custom-shape-tool/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 27a-custom-shape-tool

## Lesson Expectations
- Custom Shape Tool is nested with shape tools; set Tool Mode to Shape in Options Bar.
- Open Custom Shape Picker, use gear menu to load shape sets / All, choose Append vs Replace, pick a shape, choose Fill color, then drag a resolution-independent vector shape.
- Screenshots grounding UI: `shapes-custom-shape-tool-select-shape-mode-583817bb.gif`, `shapes-custom-shape-tool-photoshop-custom-shape-picker-9ce2fe47.gif`, `shapes-custom-shape-tool-custom-shape-picker-gear-icon-259d0fe2.gif`, `shapes-custom-shape-tool-draw-custom-shape-02d1d9ed.gif`.

## Photoweb Coverage
- Tool group includes Custom Shape in the `U` shape group in `src/App.tsx:725`.
- Options Bar supports Shape/Path/Pixels modes and Fill/Stroke controls in `src/components/Panels/OptionsBar.tsx:2187`.
- Shapes panel chooses/arms custom shape presets in `src/components/Panels/ShapesPanel.tsx:28`.
- Built-in and user custom shape libraries live in `src/tools/customShapes.ts:100`.
- Tests cover picker sets, Shapes panel selection, double-click add, and undoable custom shape layer creation in `src/test/27a-custom-shape-tool.test.tsx:41`.

## Gaps / Mismatches
- Photoshop's gear-menu `All`/Append/Replace legacy set management is not reproduced.
- Photoweb has a curated custom-shape set rather than Photoshop's full preset universe.
- Need verify exact drag modifiers for custom shape drawing, such as Shift constrain and Space reposition, against shape tool behavior.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action unless larger preset-management parity becomes a product priority.

