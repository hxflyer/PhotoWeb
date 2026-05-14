# 080 perspective-crop-tool-photoshop
- Lesson path: `doc/photoshop-essentials-basics/perspective-crop-tool-photoshop/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 06-crop

## Lesson Expectations
- Perspective Crop Tool nested behind Crop Tool; draw border, show perspective grid, drag corners to align with converging vertical/horizontal edges, Shift constrains handle movement, Enter commits.
- Result crops and corrects keystone perspective distortion.
- Screenshots grounding UI: `cc-perspective-crop-tool-photoshop-perspective-crop-tool-d4f48105.png`, `cc-perspective-crop-tool-perspective-crop-tool-grid-baf58e80.jpg`, `cc-perspective-crop-tool-drag-perspective-handle-top-left-1dc56370.jpg`, `cc-perspective-crop-tool-final-result-dc0cb1a9.jpg`.

## Photoweb Coverage
- Toolbar includes Perspective Crop Tool in Crop group in `src/components/Panels/Toolbar.tsx:57`.
- Shift+`C` cycles Crop to Perspective Crop in app tool groups (`src/App.tsx:721`) and is tested in `src/test/06-crop.test.tsx:106`.
- Perspective Crop tool is registered as a variant of crop in `src/tools/crop.ts:506`.
- Tests cover Enter committing the perspective crop rectangle in `src/test/06-crop.test.tsx:115`.

## Gaps / Mismatches
- The implementation appears to reuse crop behavior; inspected code did not show true quadrilateral perspective correction or corner-independent grid warping.
- Shift-constrained perspective-handle movement was not confirmed.
- If the test only commits a rectangle, the core Photoshop keystone correction is likely missing.

## Scope Decision
Fix

## Recommended Follow-up
Implement/verify quadrilateral perspective crop with grid handles and a pixel warp, not only rectangular crop commit.

