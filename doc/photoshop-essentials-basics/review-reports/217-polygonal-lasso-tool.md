# 217 polygonal-lasso-tool
- Lesson path: `doc/photoshop-essentials-basics/polygonal-lasso-tool/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `13-lasso`

## Lesson Expectations
- Polygonal Lasso creates straight-sided selections by clicking anchor points; close by clicking the start point or double-clicking.
- Backspace/Delete removes the last segment; Esc cancels; Shift constrains segment angles; Alt/Option temporarily switches to freehand Lasso for curves.
- UI screenshots: `selections-polygonal-lasso-tool-polygonal-lasso-tool-80c9e176.gif`, `selections-polygonal-lasso-tool-end-selection-fe21e035.gif`, `selections-polygonal-lasso-tool-temporary-switch-lasso-tool-d1f2a379.gif`.

## Photoweb Coverage
- Polygonal Lasso tool commits click-created paths and supports close/Enter/Escape/Backspace-style behavior (`src/tools/lasso.ts:102-214`).
- Toolbar and Options Bar expose Polygonal Lasso in the Lasso group (`src/components/Panels/Toolbar.tsx:41-44`, `src/components/Panels/OptionsBar.tsx:449-450`).
- Tests cover lasso group cycling and polygonal selection commits (`src/test/selection.test.ts:202-211`, `src/test/screenModeAndShortcuts.test.tsx:49-59`, `src/test/13-lasso.test.tsx`).

## Gaps / Mismatches
- Temporary Alt/Option switch from Polygonal to freehand Lasso mid-selection is not evident.
- Double-click close is not clearly represented in the tool interface/tests, though close-start and Enter close exist.

## Scope Decision
Fix.

## Recommended Follow-up
Add double-click close and decide whether temporary freehand switching is worth the gesture-engine complexity.
