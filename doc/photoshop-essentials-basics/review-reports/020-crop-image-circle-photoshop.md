# 020 crop-image-circle-photoshop
- Lesson path: `doc/photoshop-essentials-basics/crop-image-circle-photoshop/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 06-crop

## Lesson Expectations
- Unlock Background, use Elliptical Marquee, hold Shift for a perfect circle, hold Space to reposition while drawing, add layer mask, Trim transparent pixels, and save PNG.
- Screenshots include `2023-crop-image-as-circle-select-elliptical-marquee-tool-b2683f97.png`, `2023-crop-image-as-circle-force-selection-to-perfect-circle-54ddbd74.jpg`, and `2023-crop-image-as-circle-reposition-selection-outline-012d26b8.jpg`.

## Photoweb Coverage
- Background layer unlock is covered by the background-layer cluster (`src/test/07b-background-layer.test.tsx`).
- Elliptical Marquee supports Shift-constrained circles and Space-drag reposition (`src/test/12-marquee.test.tsx:99`, `src/test/12-marquee.test.tsx:110`).
- Add Layer Mask and Trim are implemented (`src/components/Panels/LayersPanel.tsx:1043`, `src/store/layersSlice.ts:1243`, `src/store/documentSlice.ts:461`, `src/components/Dialogs/TrimDialog.tsx:12`).
- PNG export is available through Export/Save As flows (`src/components/Dialogs/ExportDialog.tsx:191`, `src/components/Dialogs/SaveAsDialog.tsx:42`).

## Gaps / Mismatches
- Circular crop remains a mask plus transparent Trim workflow; documents stay rectangular, as in Photoshop.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
