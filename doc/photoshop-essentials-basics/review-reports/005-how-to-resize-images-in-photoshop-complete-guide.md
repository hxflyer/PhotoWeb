# 005 how-to-resize-images-in-photoshop-complete-guide
- Lesson path: `doc/photoshop-essentials-basics/how-to-resize-images-in-photoshop-complete-guide/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 05a-image-size

## Lesson Expectations
- Image > Image Size dialog with pixel dimensions, document size/resolution, constrained proportions, Resample on/off, interpolation method, and undoable resize.
- Edge cases include pixel-art nearest-neighbor and changing resolution without resampling.

## Photoweb Coverage
- Image Size dialog exposes size, unit, resolution, Resample toggle, and interpolation selection (`src/components/Dialogs/ImageSizeDialog.tsx:340`, `src/components/Dialogs/ImageSizeDialog.tsx:419`, `src/components/Dialogs/ImageSizeDialog.tsx:431`, `src/components/Dialogs/ImageSizeDialog.tsx:434`).
- Store resize goes through an `Image Size` history command and can change resolution without resampling (`src/store/documentSlice.ts:345`, `src/store/documentSlice.ts:360`, `src/test/05a-image-size.test.tsx:54`, `src/test/05a-image-size.test.tsx:78`).
- Resamplers include Bicubic variants and Nearest Neighbor for hard edges (`src/core/imageTransforms.ts:22`, `src/core/imageTransforms.ts:26`, `src/core/imageTransforms.ts:98`, `src/test/05a-image-size.test.tsx:113`).

## Gaps / Mismatches
- Print-production/color-management details are intentionally excluded; the resize/resample behavior itself is covered.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
