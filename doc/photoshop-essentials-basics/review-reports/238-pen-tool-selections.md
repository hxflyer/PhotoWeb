# 238 pen-tool-selections
- Lesson path: `doc/photoshop-essentials-basics/pen-tool-selections/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `15-pen-paths`

## Lesson Expectations
- Pen Tool creates paths with anchor points and direction handles; users drag handles for curves, split/rotate handles, move anchor points, and convert the path to a selection.
- Options Bar selects Paths mode; Paths panel can load path as selection; Make Selection supports feather/anti-alias options.
- UI screenshots: `pen-tool-selections-pen-tool-paths-icon-06f54bfc.gif`, `pen-tool-selections-direction-handles-b01e9984.gif`, `pen-tool-selections-make-selection-dialog-box-f4756e48.gif`.

## Photoweb Coverage
- Pen/path tooling exists with Pen, Curvature Pen, Freeform Pen, Path Selection, and Direct Selection option routing (`src/components/Panels/OptionsBar.tsx:2378-2493`, `src/tools/pen.ts`).
- Paths panel exposes Load Path as Selection (`src/components/Panels/PathsPanel.tsx:167`).
- Store can convert path to lasso-style selection (`src/store/selectionSlice.ts:876-892`).
- Tests cover pen interactions, path persistence, path-to-selection, and Paths panel exposure (`src/test/15-pen-paths.test.tsx:99`, `src/test/penInteractions.test.ts`, `src/test/pathPersistence.test.tsx`).

## Gaps / Mismatches
- The Make Selection dialog’s feather/anti-alias options are not clearly surfaced for path-to-selection; conversion appears immediate.
- Advanced Bezier handle choreography exists in tests but needs continued visual audit against Photoshop’s cursor/handle behavior.

## Scope Decision
Fix.

## Recommended Follow-up
Add a Photoshop-style `Make Selection…` dialog from Paths/Pen workflows with Feather Radius, Anti-aliased, and operation controls.
