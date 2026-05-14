# 218 lasso-tool
- Lesson path: `doc/photoshop-essentials-basics/lasso-tool/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `13-lasso`

## Lesson Expectations
- Lasso Tool draws freehand selections with drag; releasing closes back to the start point.
- Shift adds, Alt/Option subtracts, Shift+Alt/Option intersects; `Ctrl/Cmd+D` deselects.
- Flyout groups Lasso, Polygonal Lasso, and Magnetic Lasso; shortcut `L` / `Shift+L`.
- UI screenshots: `selections-lasso-tool-lasso-tool-selection-52d5da81.gif`, `selections-lasso-tool-photoshop-lasso-tools-192102e4.gif`, `selections-lasso-tool-add-to-selection-option-cb6c70f8.gif`.

## Photoweb Coverage
- Freehand lasso tool captures a path and commits selection operations (`src/tools/lasso.ts:36-101`).
- Selection operation helpers support add/subtract/intersect (`src/tools/selectionModifiers.ts:5-77`).
- Toolbar/Options Bar/Status Bar expose lasso tools (`src/components/Panels/Toolbar.tsx:41-44`, `src/components/Panels/OptionsBar.tsx:437-482`, `src/components/layout/StatusBar.tsx:20-22`).
- Tests cover lasso selection and modifier capture (`src/test/selection.test.ts:140-167`, `src/test/11a-selections-overview.test.tsx:93-106`).

## Gaps / Mismatches
- No major in-scope mismatch found for the basic freehand workflow.
- Remaining lasso-family gaps are mostly magnetic/polygonal specialty gestures.

## Scope Decision
divergence already accepted.

## Recommended Follow-up
No action for basic Lasso; handle specialty gestures under lessons 216-217.
