# 28 Patterns Gap Report

Cluster: `28-patterns`

## Lessons Reviewed

- `repeating-patterns-intro` - design a small transparent tile, use Offset with Wrap Around, define the tile as a pattern, then fill another layer with it.
- `repeating-patterns-from-custom-shapes` - use Custom Shape pixels to build a tile, offset duplicates into the corners, define the pattern, and apply it with the Paint Bucket pattern source.
- `repeating-patterns-colors-gradients` - keep the repeating pattern on its own layer so solid color and gradient layers/effects can recolor it later.

## Current Photoweb Coverage

- Pattern presets already existed with local persistence, thumbnails, rename/delete, and active-pattern selection.
- Edit > Define Pattern existed, but the capture code was duplicated in MenuBar and did not power the panel define flow.
- Paint Bucket already supported a Pattern source with active pattern selection.

## Gaps

- Edit > Fill was disabled, so lessons could not fill a layer/selection from the active pattern without using Paint Bucket.
- Pattern definition needed a shared selection-aware tile capture path.
- Filter > Other > Offset was missing, which blocked the common Wrap Around tile recipe.
- Pattern Presets panel Define Pattern captured the whole layer even when a selection was active.

## Implemented Work

- Added shared pattern helpers for selection-aware tile capture, Define Pattern, and foreground/background/pattern fills.
- Enabled Edit > Fill and added a Fill dialog with Use, Pattern, Opacity, and Preserve Transparency controls.
- Routed Edit > Define Pattern and Pattern Presets panel Define Pattern through the same selection-aware helper.
- Added Filter > Other > Offset with Wrap Around, Repeat Edge Pixels, and Transparent undefined-area modes.
- Added focused tests for selected-tile definition, pattern fill clipping, Fill dialog application, and Offset wrap behavior.

## Verification

- Focused:
  - `npx tsc -b`
  - `npx vitest run src/test/28-patterns.test.tsx src/test/presetsPanels.test.tsx src/test/fillTools.test.ts src/test/bugFixes.test.ts` - 4 files / 35 tests passed.
- Full:
  - `npx tsc -b`
  - `npm run lint` - 16 existing warnings, 0 errors.
  - `npm test` - 175 files / 1287 tests passed.
  - Dev server smoke: `curl -I http://127.0.0.1:5173/` returned `200 OK`.

## Photoshop Divergences Worth Keeping

- Edit > Fill is a compact Photoweb dialog covering the lesson-critical foreground/background/pattern path, not Photoshop's full content-aware/history/black/white/50% gray matrix.
- Pattern presets remain browser-local PNG data URL presets rather than native Photoshop `.pat` preset files.
