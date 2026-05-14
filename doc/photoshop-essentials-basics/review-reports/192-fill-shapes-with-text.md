# 192 fill-shapes-with-text
- Lesson path: `doc/photoshop-essentials-basics/fill-shapes-with-text/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `25b-type-shape-interop`

## Lesson Expectations
- Custom Shape Tool in Paths mode draws a closed path; Shift constrains, Spacebar repositions while dragging (`fill-shape-with-text-paths-option-8e875e59.gif`, `fill-shape-with-text-drawing-shape-0867511f.jpg`).
- Edit > Free Transform Path can reshape/rotate the path.
- Type Tool cursor changes when inside the path; clicking fills the path with wrapping text, often with Paragraph Justify Centered.

## Photoweb Coverage
- Type tool can create `shape` text mode from a closed path interior via type-path bridge in `src/tools/type.ts:616`.
- Path bridge hit-testing is bound from Pen paths in `src/tools/pen.ts:300`.
- Shape/path modes are tested in `src/test/26a-shape-concepts.test.tsx:64`; type-shape interop tests live in `src/test/25b-type-shape-interop.test.tsx`.

## Gaps / Mismatches
- Custom Shape Tool path-mode-to-type-inside workflow may depend on path bridge support; confirm custom shape Paths mode creates a hit-testable closed path, not only Pen paths.
- Spacebar reposition while drawing custom shape/path is a Photoshop-habit detail that needs explicit coverage.

## Scope Decision
Fix.

## Recommended Follow-up
Add an end-to-end test: Custom Shape Tool in Path mode, draw with Shift/Space behavior, click inside with Type Tool, text wraps within shape.
