# 201 free-transform
- Lesson path: `doc/photoshop-essentials-basics/free-transform/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `19a-free-transform`

## Lesson Expectations
- Ctrl/Cmd+T or Edit > Free Transform shows bounding box and handles (`free-transform-free-transform-handles-e3d73a1e.gif`).
- Drag side/corner handles to reshape/resize; Shift constrains; Alt/Option transforms from center; rotate outside corner; move inside box.
- Ctrl/Cmd modifiers access skew/distort/perspective; Enter commits, Esc cancels.

## Photoweb Coverage
- Edit menu labels Free Transform / Free Transform Path in `src/components/layout/MenuBar.tsx:247`.
- Free Transform overlay is rendered and committed/cancelled in `src/App.tsx:1304`.
- Tests exist for transform behavior and modifiers in `src/test/19a-free-transform.test.tsx` and `src/test/freeTransformModifiers.test.tsx`.

## Gaps / Mismatches
- Need to verify legacy-vs-modern Shift behavior: this lesson expects Shift to constrain; RUN-CONTRACT notes CC 2019+ changed defaults in a related cluster.
- Full skew/distort/perspective keyboard modifier parity should remain under regression coverage.

## Scope Decision
Fix.

## Recommended Follow-up
Audit tests against this lesson's legacy Shift-to-constrain expectation and document chosen Photoshop-version behavior.
