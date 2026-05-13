# 06-crop plan

## 1. Goals

### Feature A - Crop Tool shortcut polish

Add Photoshop Crop Tool shortcuts that sit on top of the existing crop rectangle: `X` swaps the crop rectangle orientation, `H` hides/shows the cropped area, `P` toggles Classic Mode, `O` continues cycling overlays, Enter commits, and Esc cancels.

### Feature B - Perspective Crop Tool entry

Expose `Perspective Crop Tool` behind Crop in the toolbar flyout and via `Shift+C`. The tool uses the existing crop rectangle/grid/commit machinery so users can draw and commit a perspective-style crop box. True projective warp is recorded as a divergence.

### Feature C - Image > Crop from selections

Enable `Image > Crop` and crop the document to the active selection bounds. This supports the rectangular marquee workflow from the centering/single-layer lessons and gives elliptical selections a rectangular document crop bound before mask/Trim workflows.

## 2. Files to edit / create

- Crop behavior: `src/tools/crop.ts`
- Menu/store: `src/components/layout/MenuBar.tsx`, `src/store/documentSlice.ts`, `src/store/types.ts`
- Tool UI: `src/components/Panels/Toolbar.tsx`, `src/components/Panels/OptionsBar.tsx`, `src/components/layout/StatusBar.tsx`, `src/App.tsx`
- Tests: `src/test/06-crop.test.tsx`
- Artifacts: this plan, `gap-report.md`, `divergence-log.md`, `work-queue.md`

## 3. Tests

- `X` swaps crop rectangle width/height around its center.
- `H` toggles hidden cropped-area state; `P` toggles Classic Mode.
- `Shift+C` cycles Crop Tool to Perspective Crop Tool.
- Perspective Crop Tool commits a crop rectangle with Enter.
- `Image > Crop`/store crop-to-selection crops to active rectangular selection bounds and clears selection.

## 4. Divergences

- Perspective Crop Tool ships as grid/crop behavior without projective image unwarp.
- Classic Mode is a surfaced option, but full image-under-border choreography remains deferred.
- Circular crop is represented by existing elliptical selection + layer mask + transparent Trim flow; documents remain rectangular.
