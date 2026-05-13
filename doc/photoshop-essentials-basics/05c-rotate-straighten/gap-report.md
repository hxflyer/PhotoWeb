# 05c-rotate-straighten Gap Report

## Lessons reviewed

- `how-to-rotate-and-straighten-images-in-photoshop-cc` - Rotate crooked photos with the Crop Tool, Crop Options Bar Straighten button, and Ruler Tool > Straighten Layer.

## Current photoweb coverage

- Canvas rotation / flip primitives: [imageTransforms.ts:40](src/core/imageTransforms.ts#L40) rotates arbitrary degrees into a newly sized canvas, and [imageTransforms.ts:59](src/core/imageTransforms.ts#L59) flips a canvas horizontally or vertically.
- Store-level image rotation: [documentSlice.ts:133](src/store/documentSlice.ts#L133) rotates all layers and updates document dimensions; [documentSlice.ts:150](src/store/documentSlice.ts#L150) flips all layers.
- Image Rotation menu: [MenuBar.tsx:338](src/components/layout/MenuBar.tsx#L338) exposes 180, 90 clockwise, 90 counter clockwise, and flip commands, but `Arbitrary...` is disabled at [MenuBar.tsx:342](src/components/layout/MenuBar.tsx#L342).
- Crop Tool straighten option: [OptionsBar.tsx:469](src/components/Panels/OptionsBar.tsx#L469) shows a `Straighten` button when Crop is active; [crop.ts:225](src/tools/crop.ts#L225) starts a straighten drag when the option is toggled; [crop.ts:251](src/tools/crop.ts#L251) rotates the canvas on mouse-up; [crop.ts:391](src/tools/crop.ts#L391) draws the temporary line.
- Crop Tool activation / shortcut: [Toolbar.tsx:52](src/components/Panels/Toolbar.tsx#L52) places Crop in the toolbar with `C`; [App.tsx:521](src/App.tsx#L521) maps `C` to the Crop Tool.
- Eyedropper group has no Ruler Tool: [Toolbar.tsx:55](src/components/Panels/Toolbar.tsx#L55) contains only Eyedropper, and [App.tsx:516](src/App.tsx#L516) maps `I` only to Eyedropper.

## Gaps

- `Image > Image Rotation > Arbitrary...` is disabled even though the core rotate helper already supports arbitrary degrees.
- No Ruler Tool exists behind the Eyedropper Tool, so users cannot draw a persistent measurement line, adjust either endpoint, or click `Straighten Layer`.
- The store has no active-layer straightening command that preserves document dimensions and produces Photoshop-like transparent corners after Ruler Tool straightening.
- Crop Tool Straighten lacks the Photoshop quick access habit: with Crop active, holding Ctrl/Cmd should temporarily draw the Straighten line without first toggling the Options Bar button.
- Crop Straighten currently always aligns to horizontal and does not choose the nearest horizontal or vertical axis for the dragged guide.
- Tests only assert that Crop Straighten resets its toggle; there is no simulator-driven coverage for Image Rotation Arbitrary, Ctrl/Cmd temporary straighten, or Ruler Tool endpoint editing.

## Photoshop-habit mismatches

- The lesson's `crop-and-straighten-rotate-straighten-photoshop-straighten-tool-dac48dae.png` screenshot shows a visible `Straighten` button in the Crop Options Bar. photoweb has the button, but the lesson's quick tip also says Ctrl/Command temporarily switches to Straighten; photoweb does not.
- The `crop-and-straighten-rotate-straighten-photoshop-ruler-tool-3a34fe6e.png` screenshot shows Ruler Tool nested behind Eyedropper in the toolbar flyout. photoweb's Eyedropper group has no flyout entry for Ruler.
- The `crop-and-straighten-rotate-straighten-photoshop-ruler-tool-straighten-layer-e9aa7401.png` screenshot shows `Use Measurement Scale`, `Straighten Layer`, and `Clear` in the Ruler Options Bar. photoweb has no Ruler Options Bar surface.
- The `crop-and-straighten-rotate-straighten-ruler-tool-starting-point-off-691bfc1a.jpg` through `...starting-point-corrected-5b42b0fd.jpg` screenshots show endpoint correction after the measurement line is drawn. photoweb's Crop Straighten line disappears immediately and has no endpoint editing mode.
- The `crop-and-straighten-rotate-straighten-photoshop-edit-undo-crop-6cf426b4.png` screenshot grounds the expected undo vocabulary after a crop/straighten action. photoweb history already records document commands, but Ruler straightening needs a single `Straighten Layer` undo entry.

## UI / UX issues

- The Crop Straighten button is text-only and usable, but it gives no active mode status beyond the button background; the line itself should be the primary canvas feedback.
- Ruler Tool needs a thin measurement line with visible endpoint handles because the lesson's Ruler workflow depends on correcting start/end placement.
- `Image Rotation > Arbitrary...` needs a real confirm/cancel UI rather than a disabled menu item.

## Photoshop divergences worth keeping

- Crop Tool full crop-border behavior remains owned by `06-crop`. This tick should not build the full Photoshop auto-resized crop border, crop repositioning, or Delete Cropped Pixels choreography beyond the Straighten interactions visible in the lesson screenshots.
