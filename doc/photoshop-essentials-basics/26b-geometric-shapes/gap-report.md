# 26b Geometric Shapes Gap Report

Cluster: `26b-geometric-shapes`

## Lessons Reviewed

- `how-to-draw-vector-shapes-in-photoshop-cs6` - Rectangle, Rounded Rectangle, Ellipse, Polygon, Line, and Custom Shape tools share the U shortcut and Shape / Path / Pixels modes.
- `how-to-draw-shapes-with-the-shape-tools` - modern geometric tools include Triangle, Live Shape radius controls, Polygon sides / Star Ratio / Smooth options, and Line arrowheads.
- `draw-5-point-star` - a 5-point star is produced with Polygon sides = 5 and Star Ratio near 47%.
- `add-subtract` - shape operation buttons create new shape layers or combine, subtract, intersect, and exclude overlapping shape areas.

## Current Photoweb Coverage

- Rectangle, Rounded Rectangle, Ellipse, Polygon, Line, and Custom Shape tools already created structured shape layers.
- Shift constrains rectangles/ellipses/polygons/lines, and Alt draws box-based shapes from center.
- Polygon star geometry, line arrowheads, and boolean mask compositing existed in the shape engine.
- 26a added clearer Shape / Path / Pixels mode behavior and undoable Pixels mode.

## Gaps

- The toolbar did not expose a dedicated Triangle Tool in the U shape flyout.
- Shape Options Bar controls did not surface corner radius, polygon sides, Star Ratio, Smooth Corners, Smooth Indents, line weight, or arrowhead settings.
- Shape operation buttons were not rendered for shape tools, even though the underlying combine/subtract/intersect/exclude machinery existed.
- Line Tool color still followed the fill swatch instead of the stroke swatch described in the lesson.

## Implemented Work

- Added `shape-triangle` to the tool registry, toolbar flyout, U shortcut cycle, status bar, and Options Bar labeling.
- Implemented Triangle as a 3-sided live polygon shape with a corner-radius option.
- Exposed tool-specific Options Bar controls for rounded corners, polygon sides / star settings, and line weight / arrowheads.
- Added an explicit `New Shape Layer` operation button and rendered the full operation row for shape tools.
- Changed Line Tool shape and pixel rendering to prefer the Stroke color, with Fill as fallback.
- Added focused tests for Triangle flyout behavior, polygon star controls, line stroke/arrow options, and subtracting a front shape from the active shape layer.

## Verification

- Focused:
  - `npx tsc -b`
  - `npx vitest run src/test/26b-geometric-shapes.test.tsx src/test/shapeLayer.test.ts src/test/shapeBoolean.test.ts src/test/shapeTransform.test.tsx src/test/26a-shape-concepts.test.tsx` - 5 files / 38 tests passed.
- Full:
  - `npx tsc -b`
  - `npm run lint` - 16 existing warnings, 0 errors.
  - `npm test` - 172 files / 1274 tests passed.
  - Dev server smoke: `curl -I http://127.0.0.1:5173/` returned `200 OK`.

## Photoshop Divergences Worth Keeping

- Shape boolean operations rasterize the composed silhouette into the active layer instead of preserving multiple editable vector subpaths in one vector mask. This is documented in `divergence-log.md`.
