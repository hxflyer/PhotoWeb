# 081 how-to-resize-pixel-art-in-photoshop
- Lesson path: `doc/photoshop-essentials-basics/how-to-resize-pixel-art-in-photoshop/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 05a-image-size

## Lesson Expectations
- Image > Image Size; enable Resample; enter percentage such as 400%; default interpolation softens pixel art.
- Choose Resample dropdown `Nearest Neighbor (hard edges)` to preserve crisp square pixels; preview verifies result.
- Screenshots grounding UI: `image-size-resolution-resize-pixel-art-photoshop-image-size-command-5b225fb9.png`, `image-size-resolution-resize-pixel-art-image-size-dialog-box-photoshopcc-2755ebbd.png`, `image-size-resolution-resize-pixel-art-choose-nearest-neighbor-resampling-6bb6087f.png`, `image-size-resolution-resize-pixel-art-nearest-neighbor-photoshop-56879276.png`.

## Photoweb Coverage
- Image Size menu uses `⌘⌥I` in `src/components/layout/MenuBar.tsx:364`.
- Image Size dialog supports pixel/percent/print units, Resample checkbox, and resampling method list including nearest in `src/components/Dialogs/ImageSizeDialog.tsx:18`.
- Resampling labels include `Nearest Neighbor (hard edges)` in `src/core/imageTransforms.ts:18`.
- Nearest-neighbor algorithm is deterministic in `src/core/imageTransforms.ts:128`.
- Tests cover Nearest Neighbor pixel-art crispness in `src/test/05a-image-size.test.tsx:113`.

## Gaps / Mismatches
- Photoshop's preview pane/window resizing is not clearly matched; Photoweb dialog appears form-first.
- No issue found with core pixel-art resizing behavior.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.

