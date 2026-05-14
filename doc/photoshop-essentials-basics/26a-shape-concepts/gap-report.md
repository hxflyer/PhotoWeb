# 26a Shape Concepts Gap Report

Cluster: `26a-shape-concepts`

## Lessons Reviewed

- `photoshop-shape-essentials` — Shape tools create vector Shape layers with editable color/fill and resolution-independent edges.
- `vectors-paths-pixels` — Shape tools have three modes: Shape Layers, Paths, and Fill Pixels; each mode creates a different kind of output.
- `vector-shapes-vs-pixel-shapes-in-photoshop` — vector shape layers remain crisp under Free Transform Path while pixel shapes are raster content.
- `drawing-vector-vs-pixel-shapes-in-photoshop-cs6` — CS6-era Tool Mode vocabulary for Shape / Path / Pixels.

## Current Photoweb Coverage

- Shape tools already exposed Shape / Path / Pixels modes in the Options Bar.
- Shape mode created `kind: 'shape'` layers with structured `shapeData` and rerendered vector geometry.
- Path mode created stored paths for geometric and custom shapes after 25a/25b.
- Pixels mode drew onto the active raster layer without creating a Shape layer.
- Shape layers already preserve `shapeData` through Move Tool and Free Transform geometry edits.

## Gaps

- Options Bar Tool Mode buttons had little discoverability and no stable test ids.
- Pixels mode drawing changed layer pixels but did not record undo history.
- Edit > Free Transform did not use Photoshop's `Free Transform Path` label when a Shape layer was active.

## Implemented Work

- Added stable Shape Tool Mode test ids and Photoshop-meaning titles for Shape, Path, and Pixels mode buttons.
- Made Pixels mode shape drawing commit an undoable pixel-history action while still avoiding Shape layer creation.
- Changed the Edit menu transform label to `Free Transform Path` when the active layer is a Shape layer.
- Added focused tests proving Shape, Path, and Pixels modes create the expected output surfaces.

## Verification

- Focused:
  - `npx tsc -b`
  - `npx vitest run src/test/26a-shape-concepts.test.tsx src/test/shapeLayer.test.ts src/test/25a-type-on-path-warp.test.tsx src/test/25b-type-shape-interop.test.tsx`
- Full:
  - `npx tsc -b`
  - `npm run lint` — 16 existing warnings, 0 errors.
  - `npm test` — 171 files / 1270 tests passed.
  - Dev server smoke: `curl -I http://127.0.0.1:5173/` returned `200 OK`.

## Photoshop Divergences Worth Keeping

- No new deliberate divergence introduced for this cluster.
