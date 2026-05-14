# 107 use-curvature-pen-tool-photoshop-cc-2018
- Lesson path: `doc/photoshop-essentials-basics/use-curvature-pen-tool-photoshop-cc-2018/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `15-pen-paths`

## Lesson Expectations
- Select Curvature Pen from the Pen flyout, set Tool Mode to Path or Shape, click points to auto-create curves, close by clicking the start, drag anchors to reshape, double-click points to toggle curve/corner, delete points, and use path appearance options (`2018-curvature-pen-tool-curvature-pen-tool-toolmode-option-d391fb8e.png`, `2018-curvature-pen-tool-curvature-pen-tool-convert-curve-corner-point-0ab0ec6c.png`).

## Photoweb Coverage
- Curvature Pen auto-generates smooth handles, closes paths, moves anchors, toggles smooth/corner on double-click, and deletes selected points (`src/tools/pen.ts:970`, `src/tools/pen.ts:1013`, `src/tools/pen.ts:1082`).
- Tests cover smooth handles, double-click corner toggle, closing path, and path-to-selection (`src/test/15-pen-paths.test.tsx:121`, `src/test/15-pen-paths.test.tsx:133`, `src/test/15-pen-paths.test.tsx:146`).
- Pen options support Path/Shape/Pixels modes (`src/test/penModes.test.ts:54`).

## Gaps / Mismatches
- Photoshop's path appearance gear options for thickness/color were not found in Options Bar.
- Right-click context conversion to selection/vector mask/shape is partially covered through Paths panel and shortcuts, not necessarily the lesson's context menu.

## Scope Decision
Fix: path appearance and context menu conversion are in-scope pen polish.

## Recommended Follow-up
Add Curvature Pen path appearance controls and verify right-click path conversion menu parity.
