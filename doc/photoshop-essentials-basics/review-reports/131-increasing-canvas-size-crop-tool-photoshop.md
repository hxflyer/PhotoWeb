# 131 increasing-canvas-size-crop-tool-photoshop
- Lesson path: `doc/photoshop-essentials-basics/increasing-canvas-size-crop-tool-photoshop/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `05b-canvas-size`

## Lesson Expectations
- Converts a Background layer to a normal layer before expanding transparent canvas.
- Uses the Crop Tool to drag crop handles outside the image, with `Alt/Option` expanding from center and `Shift` preserving the original aspect ratio.
- Commits with Enter/checkmark, then can add a solid color fill layer underneath and apply a Drop Shadow.
- Grounding screenshots include `crop-and-straighten-add-canvas-photoshop-cc-unlock-background-layer-bd9b9cec.png`, `crop-and-straighten-add-canvas-photoshop-add-canvas-original-ratio-6baae02c.jpg`, and `crop-and-straighten-add-canvas-photoshop-commit-crop-b71359c7.png`.

## Photoweb Coverage
- `src/tools/crop.ts:123` implements crop resize handles; `src/tools/crop.ts:196` handles commit; `src/tools/crop.ts:275` handles Enter/Esc and overlay shortcuts.
- `src/components/Dialogs/CanvasSizeDialog.tsx:57` and `src/store/documentSlice.ts:276` cover Image > Canvas Size with relative sizing, anchor behavior, units, and extension color.
- `src/components/layout/MenuBar.tsx:364` exposes Image Size, Canvas Size, Image Rotation, and Crop.

## Gaps / Mismatches
- Crop-based canvas expansion is not clearly equivalent to Photoshop's outward crop workflow; the stronger implementation appears to be the Canvas Size dialog.
- No verified support found for `Alt/Option` center expansion or `Shift` original-ratio locking while dragging crop handles outward.
- The lesson's fill-layer-under-image plus Drop Shadow workflow depends on layer effects coverage not surfaced here.

## Scope Decision
Fix

## Recommended Follow-up
Add targeted tests for outward crop canvas expansion, `Alt/Option` center growth, `Shift` ratio preservation, and transparent canvas results after committing.
