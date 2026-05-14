# 199 type-path-photoshop
- Lesson path: `doc/photoshop-essentials-basics/type-path-photoshop/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `25a-type-on-path-warp`

## Lesson Expectations
- Draw a path with Ellipse/Shape/Pen in Paths mode, switch to Type Tool, hover path until the type-on-path cursor appears (`type-on-a-path-type-tool-cursor-8484ba4a.jpg`).
- Click to type along the path; checkmark commits; Path Selection Tool drags text along the path or across it to flip sides.
- Path can be hidden after committing.

## Photoweb Coverage
- Type tool detects path segment hits and creates `textMode: 'path'` type layers in `src/tools/type.ts:588`.
- Rasterizer lays characters along flattened path samples in `src/tools/type.ts:815`.
- Path Selection can hit and move type path handles in `src/tools/pathSelection.ts:81`.
- Tests exist for type-on-path and warp in `src/test/25a-type-on-path-warp.test.tsx`.

## Gaps / Mismatches
- Cursor icon parity for type-on-path hover is not evident; the tool cursor is generally `text`.
- Dragging text across the path to flip side should be directly tested against Photoshop behavior.

## Scope Decision
Fix.

## Recommended Follow-up
Add hover cursor and flip-side path text tests; ensure Shape Tool Paths mode participates, not only Pen paths.
