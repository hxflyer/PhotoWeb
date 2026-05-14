# 155 vector-shapes-vs-pixel-shapes-in-photoshop
- Lesson path: `doc/photoshop-essentials-basics/vector-shapes-vs-pixel-shapes-in-photoshop/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `26a-shape-concepts`

## Lesson Expectations
- Explains Shape layers as vector/editable paths and Pixel shapes as rasterized pixels.
- Demonstrates scaling down and back up with Free Transform Path to show vector shapes stay crisp while pixel shapes degrade.
- Grounding screenshots include `shapes-vector-vs-pixel-shapes-shape-layer-icon-a497720d.gif`, `shapes-vector-vs-pixel-shapes-free-transform-path-box-6750896b.gif`, and `shapes-vector-vs-pixel-shapes-vector-vs-pixel-shape-edges-2b934429.gif`.

## Photoweb Coverage
- `src/tools/shapes.ts:27` supports Shape, Path, and Pixels modes.
- `src/tools/shapeCommands.ts:20` and `src/tools/shapeCommands.ts:99` preserve editable shape targets during moves/edits.
- `src/test/26a-shape-concepts.test.tsx:54` covers modes, `src/test/26a-shape-concepts.test.tsx:64` covers Shape/Path/Pixels outputs, and `src/test/26a-shape-concepts.test.tsx:110` checks the Free Transform Path label.

## Gaps / Mismatches
- The core concept is covered, but crispness after downscale/upscale is a visual fidelity expectation and should be screenshot-tested if not already.
- Shape combination behavior elsewhere can rasterize, which may undermine the "vector remains editable" expectation for compound workflows.

## Scope Decision
Fix

## Recommended Follow-up
Add a visual or canvas-level regression for vector-vs-pixel rescale fidelity, and keep compound shape operations aligned with the vector concept.
