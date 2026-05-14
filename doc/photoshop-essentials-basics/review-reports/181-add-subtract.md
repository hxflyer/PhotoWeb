# 181 add-subtract
- Lesson path: `doc/photoshop-essentials-basics/add-subtract/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `26b-geometric-shapes`

## Lesson Expectations
- Shape combination options in the Options Bar: New Shape Layer, Add, Subtract, Intersect, Exclude (`shapes-add-subtract-shape-options-b2a871e5.gif`).
- Vector mask thumbnail must be active; options gray out otherwise.
- Operations should combine multiple vector components on the same Shape layer and allow selecting/deleting individual components.

## Photoweb Coverage
- Shape operation buttons are exposed in the Options Bar and tests assert combine mode changes in `src/components/Panels/OptionsBar.tsx:2201` and `src/test/26b-geometric-shapes.test.tsx:133`.
- Shape operation data is typed in `src/store/types.ts:30`.

## Gaps / Mismatches
- `src/store/types.ts:30` comments that combining geometry across layers is deferred; this is not full same-layer vector component behavior from the lesson.
- Selecting/deleting individual sub-shapes on one Shape layer is not evident.

## Scope Decision
Fix.

## Recommended Follow-up
Implement true same-layer shape component operations or record the current per-shape/layer behavior as a deliberate divergence.
