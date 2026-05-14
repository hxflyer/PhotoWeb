# 085 how-to-resize-images-for-print-with-photoshop
- Lesson path: `doc/photoshop-essentials-basics/how-to-resize-images-for-print-with-photoshop/lesson.md`
- Scope status: `out_of_scope: print_output`
- Cluster coverage: `none`

## Lesson Expectations
- Image Size is used primarily for print dimensions, 300 ppi, inches, frame sizes, and Resample off (`image-size-resolution-resize-images-for-print-current-print-size-88f933e8.png`, `image-size-resolution-resize-images-for-print-width-6-inches-6ac9deb8.png`).
- The lesson recommends crop-first workflows for print aspect ratios and print quality thresholds.

## Photoweb Coverage
- Image Size can change resolution with Resample off and displays inch units (`src/components/Dialogs/ImageSizeDialog.tsx:28`, `src/test/05a-image-size.test.tsx:78`).
- Crop Tool supports aspect ratios and destructive/non-destructive crop behavior (`src/tools/crop.ts:7`, `src/test/cropSliceF.test.ts:63`).

## Gaps / Mismatches
- Print-output intent, frame sizes, and printer-resolution guidance are explicitly excluded.
- Photoweb's Image Size still contains print-like Fit To presets (4x6, 5x7, 8x10, 11x14), which may blur the scope boundary (`src/components/Dialogs/ImageSizeDialog.tsx:40`).

## Scope Decision
Out of scope.

## Recommended Follow-up
No action, except consider pruning or relabeling print-only presets if product wants a stricter web/photo-editing surface.
