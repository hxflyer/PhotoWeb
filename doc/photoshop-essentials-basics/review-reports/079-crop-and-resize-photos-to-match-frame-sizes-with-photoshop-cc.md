# 079 crop-and-resize-photos-to-match-frame-sizes-with-photoshop-cc
- Lesson path: `doc/photoshop-essentials-basics/crop-and-resize-photos-to-match-frame-sizes-with-photoshop-cc/lesson.md`
- Scope status: `out_of_scope: print_output`
- Cluster coverage: none

## Lesson Expectations
- Crop Tool `W x H x Resolution` preset; enter print frame dimensions in inches and resolution such as 300 ppi.
- Crop both changes aspect ratio and sets print size/resolution without distorting the image.
- Screenshots grounding UI: `cc-crop-image-frame-size-crop-tool-options-bar-5fa0a2b3.png`, `cc-crop-image-frame-size-w-h-resolution-crop-tool-1b9906f8.png`, `cc-crop-image-frame-size-enter-width-height-resolution-85a01abe.png`.

## Photoweb Coverage
- Crop Tool supports custom aspect ratio Width/Height fields but not print-resolution crop output; see `src/components/Panels/OptionsBar.tsx:682`.
- Image Size dialog has resolution and print-size semantics for in-scope resizing in `src/components/Dialogs/ImageSizeDialog.tsx:120`.

## Gaps / Mismatches
- No Crop Tool `W x H x Resolution` preset that sets print dimensions/resolution.
- This lesson is print-output scoped and intentionally excluded.

## Scope Decision
out of scope

## Recommended Follow-up
No action.

