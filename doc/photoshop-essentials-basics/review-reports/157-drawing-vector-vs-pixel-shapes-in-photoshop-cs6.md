# 157 drawing-vector-vs-pixel-shapes-in-photoshop-cs6
- Lesson path: `doc/photoshop-essentials-basics/drawing-vector-vs-pixel-shapes-in-photoshop-cs6/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `26a-shape-concepts`

## Lesson Expectations
- Compares drawing vector Shape layers against drawing raster Pixel shapes.
- Demonstrates shape layer icon/editability and rescaling differences after Free Transform Path versus pixel transform.
- Grounding screenshots include `shapes-vector-vs-pixel-shapes-shape-layer-icon-b57fdeca.gif`, `shapes-vector-vs-pixel-shapes-free-transform-path-box-09ecdb7d.gif`, and `shapes-vector-vs-pixel-shapes-vector-vs-pixel-shape-edges-29d1d373.gif`.

## Photoweb Coverage
- `src/tools/shapes.ts:27` supports Shape, Path, and Pixels modes.
- `src/tools/shapeCommands.ts:147` applies coalesced shape edits while preserving editable shape state.
- `src/test/26a-shape-concepts.test.tsx:64` validates Shape/Path/Pixels outputs and `src/test/26a-shape-concepts.test.tsx:92` covers pixels-mode undo.

## Gaps / Mismatches
- Same risk as lesson 155: core model exists, but visual crispness after repeated transforms needs explicit verification.
- Compound shape rasterization can conflict with the lesson's vector editability mental model.

## Scope Decision
Fix

## Recommended Follow-up
Share follow-up with lesson 155: add vector-vs-pixel transform fidelity checks and resolve compound vector editability expectations.
