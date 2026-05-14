# 193 text-shapes
- Lesson path: `doc/photoshop-essentials-basics/text-shapes/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `25b-type-shape-interop`

## Lesson Expectations
- Layer > Type > Convert to Shape converts live type to vector shape (`text-shapes-photoshop-convert-to-shape-3a248101.gif`).
- Direct Selection edits anchor points; Backspace/Delete removes selected points/holes.
- Custom Shape Tool can Add to Shape Area or Subtract from Shape Area on converted text; Path Selection selects sub-shapes; Free Transform Path transforms them.

## Photoweb Coverage
- Convert active type/raster layer to shape is implemented in `src/tools/typeCommands.ts:230` and exposed from `src/components/layout/MenuBar.tsx:528`.
- Type-to-shape tests exist in `src/test/25b-type-shape-interop.test.tsx`.
- Path/direct selection tools are registered in the `a` shortcut group in `src/App.tsx:724`.

## Gaps / Mismatches
- Conversion traces alpha to one custom path; fine-grained anchor editing of letters and sub-shape add/subtract on the same converted text layer is not evident.
- This overlaps the same-layer shape-combine gap from lesson 181.

## Scope Decision
Fix.

## Recommended Follow-up
Implement or explicitly defer editable converted-text anchors and same-layer add/subtract operations.
