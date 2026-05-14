# 084 how-to-resize-images-for-email-and-photo-sharing-with-photoshop
- Lesson path: `doc/photoshop-essentials-basics/how-to-resize-images-for-email-and-photo-sharing-with-photoshop/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `05a-image-size`

## Lesson Expectations
- Duplicate the image first via Image > Duplicate and a Duplicate Image dialog (`image-size-resolution-resize-images-for-web-photoshop-duplicate-image-command-34112f5f.png`, `image-size-resolution-resize-images-for-web-photoshop-duplicate-image-dialog-e3ed4b8b.png`).
- Image Size should show a large preview, current memory size, pixel unit selectors, Resample checkbox, constrained Width/Height, Percent option, and interpolation method (`image-size-resolution-resize-images-for-web-photoshop-cc-image-size-dialog-box-98fc90b4.png`).
- Unchecking Resample changes print resolution only, not screen pixel dimensions.

## Photoweb Coverage
- Image Size supports pixels/percent/inches/cm/mm, constrained proportions, Resample, and interpolation selection (`src/components/Dialogs/ImageSizeDialog.tsx:28`, `src/components/Dialogs/ImageSizeDialog.tsx:431`).
- Store applies resampling through one history command and leaves pixels unchanged when Resample is off (`src/store/documentSlice.ts:345`, `src/test/05a-image-size.test.tsx:78`).
- Nearest Neighbor and bicubic variants are implemented for resizing (`src/core/imageTransforms.ts:98`, `src/test/05a-image-size.test.tsx:158`).

## Gaps / Mismatches
- No Image > Duplicate / Duplicate Image dialog was found; only layer/document duplicate flows exist (`src/components/layout/MenuBar.tsx:400`, `src/store/documentSlice.ts:657`).
- Image Size preview is static and lacks Photoshop preview pan/zoom behavior.

## Scope Decision
Fix: Image > Duplicate and live Image Size preview are in-scope browser-editor behaviors.

## Recommended Follow-up
Add Image > Duplicate for a safe flattened/document copy, then replace the Image Size placeholder preview with the current composite.
