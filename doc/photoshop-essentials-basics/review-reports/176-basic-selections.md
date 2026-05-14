# 176 basic-selections
- Lesson path: `doc/photoshop-essentials-basics/basic-selections/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `11a-selections-overview`

## Lesson Expectations
- Options Bar has New, Add, Subtract, and Intersect selection icons (`photo-editing-basic-selections-options-bar-94097c33.gif`).
- Shift adds with a plus cursor, Alt/Option subtracts, Shift+Alt intersects, and default New replaces prior selections.
- Mode chosen in Options Bar persists for the next selection gesture.

## Photoweb Coverage
- Selection modifier resolver maps Shift/Alt to add/subtract/intersect in `src/tools/selectionModifiers.ts:8`.
- Selection combine operations are rasterized for true intersection in `src/tools/selectionModifiers.ts:74`.
- Tests cover Options Bar Add mode and modifier capture for marquee/lasso/cursors in `src/test/11a-selections-overview.test.tsx:69`.

## Gaps / Mismatches
- None found after checking selection modifiers, Options Bar tests, and cluster coverage.

## Scope Decision
divergence already accepted.

## Recommended Follow-up
No action.
