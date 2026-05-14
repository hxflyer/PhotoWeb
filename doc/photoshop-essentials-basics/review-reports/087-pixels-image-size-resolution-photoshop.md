# 087 pixels-image-size-resolution-photoshop
- Lesson path: `doc/photoshop-essentials-basics/pixels-image-size-resolution-photoshop/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `05a-image-size`

## Lesson Expectations
- Zooming past 500% reveals pixels and Photoshop's Pixel Grid, toggleable via View > Show > Pixel Grid (`image-size-resolution-pixels-imagesize-resolution-photoshop-pixel-grid-7ed3b4ec.jpg`, `image-size-resolution-pixels-imagesize-resolution-photoshop-pixel-grid-option-031b4db4.png`).
- Image Size shows pixel dimensions, resolution, and disables pixel units when Resample is off (`image-size-resolution-pixels-imagesize-resolution-pixels-measurement-type-unavailable-edb0128a.png`).
- Resolution changes print size, not image file size.

## Photoweb Coverage
- Image Size supports resolution-only edits with Resample off and disables pixel units in that state (`src/components/Dialogs/ImageSizeDialog.tsx:430`, `src/test/05a-image-size.test.tsx:78`).
- Viewport draws a zoom-dependent grid overlay when enabled (`src/components/Canvas/Viewport.tsx:334`).
- Zoom tooling supports high zoom and 100%/fit shortcuts (`src/test/03-navigation.test.tsx:40`, `src/components/layout/MenuBar.tsx:630`).

## Gaps / Mismatches
- No View > Show > Pixel Grid menu item was found, so pixel-grid discovery does not match Photoshop.
- It is unclear from code search whether the grid automatically appears only at Photoshop's high-zoom threshold.

## Scope Decision
Fix: pixel-grid toggle is in scope as a navigation/view habit.

## Recommended Follow-up
Add View > Show > Pixel Grid and ensure the overlay auto/threshold behavior matches Photoshop expectations.
