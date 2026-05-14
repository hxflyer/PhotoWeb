# 182 vectors-paths-pixels
- Lesson path: `doc/photoshop-essentials-basics/vectors-paths-pixels/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `26a-shape-concepts`

## Lesson Expectations
- Shape tools offer Shape Layers, Paths, and Fill Pixels modes (`shapes-vectors-paths-pixels-photoshop-shape-options-b74e7a39.gif`).
- Shape mode creates editable vector Shape layers with color swatches; Path mode creates Work Paths; Pixels mode paints directly on the active raster layer.
- Vector shapes remain crisp when resized.

## Photoweb Coverage
- Options Bar exposes Shape/Path/Pixels modes with Photoshop meanings in `src/components/Panels/OptionsBar.tsx:2188`.
- Tests verify Shape, Path, and Pixels output surfaces in `src/test/26a-shape-concepts.test.tsx:54`.
- Pen/path store backs Work Paths in `src/tools/pen.ts:96`; shape rendering is backed by structured `shapeData`.

## Gaps / Mismatches
- Shape layers are browser-canvas/vector-data hybrids; output crispness depends on rerendering and browser canvas rather than Photoshop vector print fidelity.
- Path panel persistence and advanced path management are limited compared with Photoshop.

## Scope Decision
divergence already accepted.

## Recommended Follow-up
No action unless product wants stronger path-management parity.
