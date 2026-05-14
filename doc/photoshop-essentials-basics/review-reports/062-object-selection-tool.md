# 062 object-selection-tool
- Lesson path: `doc/photoshop-essentials-basics/object-selection-tool/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 14a-content-selection-tools

## Lesson Expectations
- Object Selection Tool is in the W selection group; Options Bar includes Mode Rectangle/Lasso, Sample All Layers, Auto-Enhance, Object Subtract.
- Drag a rough rectangle/lasso around an object and Photoshop shrink-wraps the selection; Shift adds, Alt/Option subtracts.
- In Lasso mode, Alt/Option temporarily switches to Polygonal Lasso.
- Screenshots grounding UI: `selections-object-selection-tool-object-selection-tool-photoshop-f-fbb1ba9c.jpg`, `selections-object-selection-tool-object-selection-options-bar-ec6dd525.png`, `selections-object-selection-tool-mode-options-18a09a0b.png`, `selections-object-selection-tool-selection-outline-b8802969.jpg`.

## Photoweb Coverage
- Toolbar includes Object Selection in the W group in `src/components/Panels/Toolbar.tsx:50`.
- Tool options model includes rectangle/lasso, Sample All Layers, Auto Enhance, Object Subtract in `src/tools/objectSelection.ts:12`.
- Tool shrink-wraps rough geometry to visible pixels and can smooth with Auto Enhance in `src/tools/objectSelection.ts:97`.
- Shift/Alt selection operation is resolved on pointer down in `src/tools/objectSelection.ts:161`.
- Tests cover registration, Options Bar toggles, rectangle shrink-wrap, lasso, add/subtract, and Object Subtract behavior in `src/test/14a-content-selection-tools.test.tsx:62`.

## Gaps / Mismatches
- No AI Object Finder mode, correctly excluded.
- Alt/Option temporary Polygonal Lasso inside Object Selection lasso mode was not found.
- Shrink-wrap is alpha/visible-pixel based, not semantic object detection; acceptable for non-AI scope but less powerful than Photoshop's result.

## Scope Decision
Fix

## Recommended Follow-up
Add Alt/Option polygonal-lasso behavior in Object Selection lasso mode if it is not already covered elsewhere.

