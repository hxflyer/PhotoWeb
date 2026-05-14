# 25b Type / Shape Interop Gap Report

Cluster: `25b-type-shape-interop`

## Lessons Reviewed

- `fill-shapes-with-text` — draw a Custom Shape as a path, click inside it with the Type Tool, and type text constrained to the path interior.
- `text-shapes` — use Layer > Type > Convert to Shape, then treat the converted text as a shape/path object.

## Current Photoweb Coverage

- Type layers already supported point, area, path text, rich styling, re-editing, and conversion to a custom shape layer through Properties and Layer > Type.
- Shape tools already supported Shape/Path/Pixels modes for geometric tools after 25a.
- Custom Shape presets were available as SVG path data rendered into custom shape layers.
- `convertActiveLayerToShape()` already traced type-layer alpha into a `shapeData.kind === 'custom'` layer with undo.

## Gaps

- Custom Shape Tool `Path` mode did not create a stored path, so the fill-shape-with-text workflow could not start from a custom shape.
- The Type Tool could click on path segments for type-on-path but could not click inside closed paths for a text frame.
- Type layers had no text-frame payload for a closed path interior.
- Type rasterization did not clip text to an arbitrary closed path.

## Implemented Work

- Added Custom Shape Tool `Path` mode conversion from built-in SVG preset paths to editable path anchors.
- Added closed-path interior hit-testing through the Type/Pen bridge.
- Added `textMode: 'shape'` Type layers with a copied `shapeText.path`.
- Added shape-text rasterization that clips to the closed path and wraps text within the path bounds.
- Kept the existing Convert to Shape command as the type-to-shape conversion path and added focused coverage for the conversion/undo round trip.

## Verification

- Focused:
  - `npx tsc -b`
  - `npx vitest run src/test/25b-type-shape-interop.test.tsx src/test/25a-type-on-path-warp.test.tsx src/test/penShapeMode.test.ts src/test/08b-properties-panel.test.tsx`
- Full:
  - `npx tsc -b`
  - `npm run lint` — 16 existing warnings, 0 errors.
  - `npm test` — 170 files / 1266 tests.
  - Dev server smoke test: `curl -I http://127.0.0.1:5173/` returned `200 OK`.

## Photoshop Divergences Worth Keeping

- Custom Shape path conversion supports the built-in preset command set used by photoweb's library; SVG arcs are approximated as editable line segments in Path mode so the path remains anchor-editable in the browser.
- Shape text uses a clipped paragraph frame based on the path bounds rather than Photoshop's full text-composition engine for arbitrary concave path interiors.
