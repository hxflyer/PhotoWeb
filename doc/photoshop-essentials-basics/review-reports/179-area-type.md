# 179 area-type
- Lesson path: `doc/photoshop-essentials-basics/area-type/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `24-type-basics`

## Lesson Expectations
- Type Tool click creates point type; click-drag creates area type box (`type-area-type-area-type-drag-selection-f3f86cb6.gif`).
- Area type wraps text automatically to the box edge and has resize handles; Shift while dragging makes a square.
- Options Bar font/style/size/color/alignment work before or after drawing.

## Photoweb Coverage
- Type tool supports `point`, `box`, `path`, and `shape` text modes in `src/tools/type.ts:9`.
- Tests verify click creates point type and drag creates area type in `src/test/24-type-basics.test.tsx:77`.
- Rasterizer wraps text for constrained boxes in `src/tools/type.ts:883`.

## Gaps / Mismatches
- Resize handles for an existing area type box are not evident outside Free Transform; Photoshop area type has box handles during text edit.
- Shift-constrain-to-square while drawing area type should be explicitly tested.

## Scope Decision
Fix.

## Recommended Follow-up
Add a Shift-drag area-type test and verify/edit-box resize handles against the lesson screenshots.
