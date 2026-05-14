# 156 how-to-draw-vector-shapes-in-photoshop-cs6
- Lesson path: `doc/photoshop-essentials-basics/how-to-draw-vector-shapes-in-photoshop-cs6/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `26b-geometric-shapes`

## Lesson Expectations
- Draws vector shape layers with Rectangle, Rounded Rectangle, Ellipse, Polygon, Line, and Custom Shape tools.
- Uses Shape mode, fill/stroke options, dimensions, `Shift` for constrained proportions/angles, `Alt/Option` from center, and path/shape editability after drawing.
- Photoshop CS6 options include polygon sides/star/smooth settings and line arrowheads.

## Photoweb Coverage
- `src/tools/shapes.ts:27` defines mode, kind, and combine options; `src/tools/shapes.ts:128` implements `Shift` and `Alt/Option` draw modifiers.
- `src/tools/shapes.ts:175` resolves line endpoints including snapped angles; `src/tools/shapes.ts:192` builds rectangle, ellipse, triangle, polygon, line, and custom shape data.
- `src/test/26b-geometric-shapes.test.tsx:70` covers Triangle, `src/test/26b-geometric-shapes.test.tsx:87` covers polygon/star/smooth settings, and `src/test/26b-geometric-shapes.test.tsx:112` covers line arrowheads.

## Gaps / Mismatches
- `src/test/26b-geometric-shapes.test.tsx:130` indicates subtract shape behavior rasterizes to one raster layer, which diverges from Photoshop's editable vector boolean expectations.
- Detailed Photoshop Options Bar parity is likely intentionally reduced.

## Scope Decision
Fix

## Recommended Follow-up
Decide whether vector boolean operations should remain editable; if yes, replace rasterized subtract behavior with editable compound shape data and tests.
