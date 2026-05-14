# 27b Custom Shape Presets Gap Report

Cluster: `27b-custom-shape-presets`

## Lessons Reviewed

- `custom-shapes` - trace/create a shape, then use Edit > Define Custom Shape to save it as a reusable preset.
- `custom-shape-sets` - use Preset Manager to select Custom Shapes, save a set, reset shapes, and load a saved set later.

## Current Photoweb Coverage

- 27a added grouped built-in custom shape presets, the Shapes panel, picker set loading, and canvas drops.
- Shape layers preserve structured `shapeData`, so active geometric/custom Shape layers can be converted into reusable preset paths.
- The Custom Shape Tool already reads presets from the shared custom shape library.

## Gaps

- No user-defined custom shape library existed.
- Edit > Define Custom Shape was missing.
- Custom shape sets could not be saved or loaded.
- Shapes panel and Options Bar picker did not refresh after user presets were added.

## Implemented Work

- Added browser-local user custom shape groups with persistence.
- Added `defineActiveLayerAsCustomShape()` to convert the active Shape layer into a normalized 100x100 preset path.
- Added Edit > Define Custom Shape with a name prompt and active Shape layer validation.
- Added Photoweb JSON export/import helpers for custom shape sets.
- Added Edit > Presets > Save Custom Shape Set / Load Custom Shape Set commands using JSON copy/paste.
- Wired custom-shape library change events so the Shapes panel and Options Bar picker refresh after define/load.
- Added focused tests for define, export/import, path normalization, and the Edit menu command.

## Verification

- Focused:
  - `npx tsc -b`
  - `npx vitest run src/test/27b-custom-shape-presets.test.tsx src/test/27a-custom-shape-tool.test.tsx src/test/presetsPanels.test.tsx src/test/26b-geometric-shapes.test.tsx` - 4 files / 23 tests passed.
- Full:
  - `npx tsc -b`
  - `npm run lint` - 16 existing warnings, 0 errors.
  - `npm test` - 174 files / 1283 tests passed.
  - Dev server smoke: `curl -I http://127.0.0.1:5173/` returned `200 OK`.

## Photoshop Divergences Worth Keeping

- Custom shape set save/load uses Photoweb JSON copied/pasted through browser prompts instead of native `.csh` files and OS file dialogs.
- Shape-layer-to-preset conversion normalizes supported Photoweb `ShapeData` into SVG path data; complex Photoshop compound vectors remain outside this cluster.
