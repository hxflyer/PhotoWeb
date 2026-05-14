# 083 how-to-calculate-image-size-in-photoshop
- Lesson path: `doc/photoshop-essentials-basics/how-to-calculate-image-size-in-photoshop/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `05a-image-size`

## Lesson Expectations
- Image > Image Size opens a dialog showing pixel dimensions and memory size; screenshots `image-size-resolution-pixel-dimensions-image-size-photoshop-image-size-dialog-box-a06d6f64.jpg` and `image-size-resolution-pixel-dimensions-image-size-image-size-dimensions-b77c8bc3.png` ground the UI.
- File size is explained as width x height x 3 RGB bytes, converted to KB/MB.
- Channels panel shows RGB plus Red/Green/Blue channels in `image-size-resolution-pixel-dimensions-image-size-photoshop-channels-panel-76cd5ade.png`.

## Photoweb Coverage
- Image Size dialog computes RGB memory size with 3 bytes per pixel and displays Dimensions and Image Size (`src/components/Dialogs/ImageSizeDialog.tsx:115`, `src/components/Dialogs/ImageSizeDialog.tsx:349`).
- Image > Image Size uses the Photoshop shortcut Cmd/Ctrl+Alt+I (`src/components/layout/MenuBar.tsx:364`).
- Tests verify opening the dialog, linked dimensions, and history (`src/test/05a-image-size.test.tsx:54`).
- Channels panel exists for RGB-style channel workflows (`src/components/Panels/ChannelsPanel.tsx`).

## Gaps / Mismatches
- The dialog preview is a static placeholder gradient, not a live preview of the current image (`src/components/Dialogs/ImageSizeDialog.tsx:344`).
- Channels panel coverage is broader than this lesson needs, but the lesson's RGB file-size explanation is implemented.

## Scope Decision
Fix: live Image Size preview fidelity is in scope for Photoshop-fluent resizing.

## Recommended Follow-up
Render the active composite in the Image Size preview instead of the placeholder.
