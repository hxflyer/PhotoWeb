# 25a Type On Path / Warp Text Gap Report

Cluster: `25a-type-on-path-warp`

## Lessons Reviewed

- `type-on-a-path` — create a path, hover the Type Tool until the type-on-path cursor appears, click the path, type along it, and use Path/Direct Selection to move text around or flip sides.
- `type-path-photoshop` — older-version coverage of the same path-type workflow and path visibility expectations.
- `warp-text` — open the Warp Text dialog from the Type Options Bar, choose a warp style, orientation, bend, horizontal distortion, and vertical distortion, then reopen/change later.

## Current Photoweb Coverage

- Pen and Curvature Pen already stored editable vector paths with anchors, handles, Path Selection, Direct Selection, Paths panel persistence, stroke/fill/load-selection commands, and overlays.
- The Type layer model already had a `warp` payload and the rasterizer already supported many Photoshop-style warp presets.
- The Type Options Bar already showed the Warp Text icon, but it had no behavior.
- Shape Tool Options Bar already exposed `Shape`, `Path`, and `Pixels` mode choices, but shape `Path` mode did not create a stored vector path.

## Gaps

- Shape Tool `Path` mode did not add paths for rectangle, ellipse, line, or polygon shapes.
- Clicking a Pen/Shape path with the Type Tool did not create type-on-path.
- Type layers could not store a copied path, start offset, end offset, or flipped side for text-on-path.
- Direct Selection could not move the start/end handles for type-on-path text.
- Warp Text had no dialog, no Options Bar action, no live preview, and no undoable command path.
- Warp Text orientation was stored but the raster warp applier did not distinguish horizontal vs vertical orientation.

## Implemented Work

- Added stored paths from Shape Tool `Path` mode for rectangle, rounded rectangle, ellipse, polygon/star, and line tools.
- Added Type Tool path hit-testing: clicking a stored path creates a Type layer with `textMode: 'path'`, a copied `pathText.path`, start offset, and editable text.
- Added path-text rasterization that samples Bezier paths, places glyphs along tangent angles, respects tracking/style runs, and stores path bounds for hit-testing.
- Added Direct Selection support for type-on-path start/end handles, including side flipping when dragging across the path.
- Added a Warp Text dialog from the Type Options Bar with style, horizontal/vertical orientation, Bend, Horizontal Distortion, and Vertical Distortion controls.
- Routed Warp Text preview through coalesced type-layer edits so changes preview live, OK commits one undoable history action, and Cancel restores the original warp.
- Updated the Warp Text raster utility so vertical orientation produces a distinct vertical warp.

## Verification

- Focused:
  - `npx tsc -b`
  - `npx vitest run src/test/25a-type-on-path-warp.test.tsx src/test/warpText.test.ts src/test/penShapeMode.test.ts src/test/vectorSliceJ.test.ts src/test/24-type-basics.test.tsx`
- Full:
  - `npx tsc -b`
  - `npm run lint` — 16 existing warnings, 0 errors.
  - `npm test` — 169 files / 1263 tests.
  - Dev server smoke test: `curl -I http://127.0.0.1:5173/` returned `200 OK`.

## Photoshop Divergences Worth Keeping

- Custom Shape Tool `Path` mode is still deferred because parsing arbitrary SVG preset paths into editable Pen anchors needs a dedicated custom-shape preset pass.
