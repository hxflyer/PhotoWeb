# 007 make-selections-photoshop
- Lesson path: `doc/photoshop-essentials-basics/make-selections-photoshop/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 11a-selections-overview

## Lesson Expectations
- Selections isolate image regions for edits; tools create marching ants; selections can be added, subtracted, intersected, moved, deselected, and inverted.
- Photoshop habits: Shift adds, Alt/Option subtracts, Shift+Alt intersects, and Select menu commands operate on active selections.

## Photoweb Coverage
- Options Bar selection operation buttons expose New/Add/Subtract/Intersect (`src/components/Panels/OptionsBar.tsx:88`, `src/components/Panels/OptionsBar.tsx:96`, `src/test/11a-selections-overview.test.tsx:69`).
- Modifier behavior is tested for Alt/Option subtract, Shift add, and Shift+Alt intersect cursor (`src/test/11a-selections-overview.test.tsx:83`, `src/test/11a-selections-overview.test.tsx:93`, `src/test/11a-selections-overview.test.tsx:109`).
- Rasterized selection operations and edge tracing support more complex selection masks (`src/utils/selectionUtils.ts`, `src/test/selectionEdge.test.ts:4`).

## Gaps / Mismatches
- None found after checking lesson, scope, cluster docs, selection tools, and tests.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
