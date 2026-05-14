# 024 how-to-crop-a-single-layer-in-photoshop
- Lesson path: `doc/photoshop-essentials-basics/how-to-crop-a-single-layer-in-photoshop/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 06-crop

## Lesson Expectations
- Crop only one layer by selecting the desired area, inverting/deleting or masking the outside, rather than using the document-wide Crop Tool.
- Lesson distinguishes document crop from layer-local crop and relies on selections, masks, and non-destructive alternatives.

## Photoweb Coverage
- Image > Crop crops all layers and the document to active selection bounds (`src/store/documentSlice.ts:427`, `src/test/06-crop.test.tsx:135`).
- Layer mask workflows can non-destructively hide outside a selection (`src/store/layersSlice.ts:1243`, `src/test/17-layer-masks.test.tsx:48`).
- Selection tools support the required rectangular/elliptical selection setup (`src/test/12-marquee.test.tsx:63`).

## Gaps / Mismatches
- No explicit "crop active layer only" command was found. Current `cropToSelection` resizes every layer and the document (`src/store/documentSlice.ts:437`).
- The mask workaround is available, but Photoshop users following the single-layer crop lesson may expect a direct layer-local pixel crop/delete flow.

## Scope Decision
Fix

## Recommended Follow-up
Add a documented layer-local crop/delete-outside workflow or explicitly mark the mask-based workflow as the accepted divergence for single-layer cropping.
