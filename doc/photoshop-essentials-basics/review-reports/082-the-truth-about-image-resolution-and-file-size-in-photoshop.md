# 082 the-truth-about-image-resolution-and-file-size-in-photoshop
- Lesson path: `doc/photoshop-essentials-basics/the-truth-about-image-resolution-and-file-size-in-photoshop/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 05a-image-size

## Lesson Expectations
- Image > Image Size displays Image Size/file-size estimate, Dimensions in pixels, Width/Height print size, Resolution ppi, and Resample checkbox.
- With Resample off, changing Resolution changes print dimensions only; pixel dimensions and file-size estimate stay unchanged.
- Teaches that there is no special "web resolution"; file size depends on pixel dimensions/compression, not ppi.
- Screenshots grounding UI: `image-size-resolution-image-resolution-file-size-image-size-dialog-box-photoshop-cc-91f3a207.jpg`, `image-size-resolution-image-resolution-file-size-current-image-resolution-value-5e6617d1.png`, `image-size-resolution-image-resolution-file-size-turn-resample-off-d74769cd.png`, `image-size-resolution-image-resolution-file-size-file-size-not-changed-2660fc50.png`.

## Photoweb Coverage
- Image Size dialog tracks current width/height/resolution and file-size estimate via `formatSizeMB` in `src/components/Dialogs/ImageSizeDialog.tsx:102`.
- Resample-off commits resolution-only changes and preserves pixel dimensions in `src/components/Dialogs/ImageSizeDialog.tsx:223`.
- Store `resizeImage` updates resolution while skipping resample when requested in `src/store/documentSlice.ts:345`.
- Tests cover resample-off resolution-only behavior and undo/redo ppi restore in `src/test/05a-image-size.test.tsx:78`.

## Gaps / Mismatches
- Image Size file-size estimate uses uncompressed RGB memory math; it does not model JPEG/PNG compression, which is acceptable for Photoshop-style dialog estimate but should be labelled clearly.
- UI may not make the "web resolution myth" educational point; not necessary for an editor surface.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.

