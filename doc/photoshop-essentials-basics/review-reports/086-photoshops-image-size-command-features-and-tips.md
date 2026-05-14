# 086 photoshops-image-size-command-features-and-tips
- Lesson path: `doc/photoshop-essentials-basics/photoshops-image-size-command-features-and-tips/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `05a-image-size`

## Lesson Expectations
- Image > Image Size / Ctrl+Alt+I opens Image Size (`image-size-resolution-image-size-dialog-box-photoshop-image-size-command-ce84afcd.png`).
- The dialog preview supports scroll, click-to-jump, zoom buttons, Ctrl/Cmd-click zoom in, Alt/Option-click zoom out, and resizing the dialog (`image-size-resolution-image-size-dialog-box-scroll-preview-window-image-size-62bf495b.jpg`, `image-size-resolution-image-size-dialog-box-image-size-preview-window-zoom-34d48120.jpg`).
- Right panel includes current file size, pixel dimensions, Fit To presets, orientation swap behavior, Resample, units, and interpolation choices.

## Photoweb Coverage
- Shortcut and menu path exist (`src/components/layout/MenuBar.tsx:364`).
- Dialog has Image Size, Dimensions, Fit To, linked Width/Height, Resolution, Resample, and method dropdown (`src/components/Dialogs/ImageSizeDialog.tsx:349`, `src/components/Dialogs/ImageSizeDialog.tsx:356`, `src/components/Dialogs/ImageSizeDialog.tsx:431`).
- Tests cover linked edits, Fit To/orientation-style preset handling, Resample off, and interpolation (`src/test/05a-image-size.test.tsx:54`).

## Gaps / Mismatches
- Preview is not the actual image and has no scroll/jump/zoom controls.
- Dialog is fixed-size, unlike Photoshop's resizable Image Size dialog.
- Fit To presets include several Photoshop-like entries, but no Window-menu "match another open document" behavior.

## Scope Decision
Fix: preview interaction and document-match presets are Photoshop-habit features for resizing.

## Recommended Follow-up
Implement live preview zoom/pan and resizable dialog; add match-open-document integration if multi-document state remains available.
