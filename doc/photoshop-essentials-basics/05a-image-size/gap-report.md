# 05a-image-size gap report

## Lessons reviewed

- `how-to-resize-images-in-photoshop-complete-guide` — chapter overview tying pixels, image size, resolution, email/web resizing, pixel art, file size, and Preserve Details upscaling together.
- `photoshops-image-size-command-features-and-tips` — Image > Image Size dialog tour: preview, Image Size / Dimensions header, Fit To, width/height/resolution fields, Resample, interpolation menu, reset, OK/Cancel.
- `pixels-image-size-resolution-photoshop` — pixel dimensions vs print dimensions, Resample off behavior, resolution/print-size relationship, and resolution not affecting file size.
- `the-truth-about-image-resolution-and-file-size-in-photoshop` — changing resolution with Resample off changes print size only; file size and pixel dimensions stay fixed.
- `how-to-calculate-image-size-in-photoshop` — Image Size's memory estimate is width × height × three RGB channels, reported in megabytes.
- `how-to-resize-images-for-email-and-photo-sharing-with-photoshop` — downsampling for screen/email by enabling Resample, setting Width/Height in pixels, keeping resolution irrelevant, and choosing interpolation.
- `how-to-resize-pixel-art-in-photoshop` — upscale pixel art by percentage with Nearest Neighbor (hard edges), then optionally downsample to an exact pixel size.
- `upscale-images-photoshop-cc-2018` — enlargement workflow using Preserve Details 2.0 in the Resample method menu.
- `resize-image-match-another-photoshop` — Photoshop can populate Image Size dimensions from another open document through the Window menu.

## Current photoweb coverage

- Image menu and shortcut:
  - [MenuBar.tsx](../../../src/components/layout/MenuBar.tsx#L336) exposes `Image > Image Size...` with `⌘⌥I`.
  - [App.tsx](../../../src/App.tsx#L425) opens the dialog on `Cmd/Ctrl+Alt/Option+I`.
- Existing dialog:
  - [ImageSizeDialog.tsx](../../../src/components/Dialogs/ImageSizeDialog.tsx#L45) renders a compact dialog with Width, Height, a Constrain Proportions chain button, Resample checkbox, method select, Cancel, and OK.
  - [ImageSizeDialog.tsx](../../../src/components/Dialogs/ImageSizeDialog.tsx#L97) sends current pixel dimensions when Resample is off, avoiding accidental resampling.
- Pixel transform engine:
  - [imageTransforms.ts](../../../src/core/imageTransforms.ts#L6) has `automatic`, `bicubic-smoother`, `bicubic-sharper`, `bicubic`, `bilinear`, and `nearest`.
  - [imageTransforms.ts](../../../src/core/imageTransforms.ts#L25) resolves Automatic to smoother on enlargement and sharper on reduction.
  - [imageTransforms.ts](../../../src/core/imageTransforms.ts#L92) implements deterministic nearest, bilinear, and bicubic-family resamplers.
- Store action:
  - [documentSlice.ts](../../../src/store/documentSlice.ts#L163) resamples every layer through history and guards browser allocation size.
- Existing tests:
  - [batchDDocumentDialogs.test.tsx](../../../src/test/batchDDocumentDialogs.test.tsx#L44) covers method order, nearest neighbor blocks, automatic resolution, and a basic dialog confirmation.
  - [transforms.test.ts](../../../src/test/transforms.test.ts#L161) covers store dimension changes and undo/redo for image resizing.

## Gaps

- No persistent document resolution state. [types.ts](../../../src/store/types.ts#L218) declares `resolution`, but [documentSlice.ts](../../../src/store/documentSlice.ts#L80) does not initialize or update it, and [StatusBar.tsx](../../../src/components/layout/StatusBar.tsx#L278) hard-codes `72 ppi`.
- Resample-off behavior is wrong. Photoshop lets Width/Height remain editable in print units and keeps pixel dimensions fixed while Resolution changes; photoweb disables Width/Height entirely when Resample is off ([ImageSizeDialog.tsx](../../../src/components/Dialogs/ImageSizeDialog.tsx#L127)). Grounding screenshots: `image-size-resolution-image-size-dialog-box-turn-resample-off-4b807d9a.png`, `image-size-resolution-pixels-imagesize-resolution-pixels-measurement-type-unavailable-edb0128a.png`.
- The dialog has no Image Size memory estimate or current/new comparison. Photoshop shows `Image Size: 47.5M`, then `24.7M (was 47.5M)` after resizing. Grounding screenshots: `image-size-resolution-image-size-dialog-box-current-image-file-size-d2009c68.png`, `image-size-resolution-image-size-dialog-box-image-size-ok-cancel-buttons-0eab9d24.jpg`.
- The dialog lacks the Dimensions header/dropdown and Fit To presets shown above Width/Height. Grounding screenshots: `image-size-resolution-image-size-dialog-box-current-pixel-dimensions-0a18dd1e.png`, `image-size-resolution-image-size-dialog-box-fit-to-preset-sizes-a1c2b115.png`.
- Width/Height units are fixed to pixels. Photoshop supports Pixels, Percent, Inches, Centimeters, Millimeters, Points, Picas, and Columns; with Resample off, Pixels is unavailable for Width/Height. Grounding screenshots: `image-size-resolution-image-size-dialog-box-image-dimensions-measurement-tyoes-5249ae0a.png`, `image-size-resolution-pixels-imagesize-resolution-pixels-measurement-type-unavailable-edb0128a.png`.
- Interpolation vocabulary is close but incomplete. Photoshop exposes Preserve Details (enlargement), Preserve Details 2.0, Bicubic Smoother, Bicubic Sharper, Bicubic (smooth gradients), Nearest Neighbor (hard edges), and Bilinear. photoweb omits both Preserve Details choices and uses shorter labels ([imageTransforms.ts](../../../src/core/imageTransforms.ts#L16)). Grounding screenshots: `image-size-resolution-image-size-dialog-box-photoshop-image-interpolation-methods-ff4bba8d.png`, `2018-preserve-details-2-photoshop-choose-preserve-details-2.0-a039d31d.png`, `image-size-resolution-resize-pixel-art-nearest-neighbor-interpolation-27b2c44e.png`.
- New Document has a Resolution field, but creating the document discards it: [NewDocumentDialog.tsx](../../../src/components/Dialogs/NewDocumentDialog.tsx#L210) calls `newDocument(width, height, bgColor, name.trim())`.

## Photoshop-habit mismatches

- `Image > Image Size...` and `Cmd/Ctrl+Alt/Option+I` are correct, grounded by `image-size-resolution-image-size-dialog-box-photoshop-image-size-command-ce84afcd.png`.
- Photoshop users expect unchecking Resample to preserve pixels and edit print dimensions/resolution, not gray out Width/Height. Screenshots: `image-size-resolution-image-size-dialog-box-turn-resample-off-4b807d9a.png`, `image-size-resolution-image-resolution-file-size-lower-resolution-file-size-dd3acd56.png`.
- Photoshop users expect changing Width with the chain linked to update Height proportionally, and clicking the chain to allow independent aspect changes. photoweb has the chain behavior but no unit-aware Width/Height choreography. Screenshot: `image-size-resolution-resize-images-for-web-height-unlinked-2fb04c03.png`.
- Pixel-art users expect `Nearest Neighbor (hard edges)` in the Resample menu; photoweb says only `Nearest Neighbor`, making the Photoshop-specific reason less discoverable. Screenshot: `image-size-resolution-resize-pixel-art-nearest-neighbor-interpolation-27b2c44e.png`.
- Users following the upscaling lesson expect `Preserve Details 2.0`; photoweb has no such menu item. Screenshot: `2018-preserve-details-2-photoshop-choose-preserve-details-2.0-a039d31d.png`.

## UI / UX issues

- The dialog is much narrower than Photoshop's CC Image Size dialog and omits the left preview window shown in `image-size-resolution-image-size-dialog-box-photoshop-image-size-dialog-box-b50acf75.jpg`.
- Header fields are missing, so users cannot see whether a proposed resize changes memory footprint before clicking OK.
- Disabling Width/Height with Resample off hides the print-size mental model that the lessons spend the most time teaching.
- The OK button is always enabled, even if the entered result would be invalid or non-finite after unit conversion.

## Photoshop divergences worth keeping

- Photoshop can use the Window menu inside Image Size to match another open document; photoweb remains single-document per CLAUDE.md §4, so this workflow is not implemented in this tick.
- Photoshop's Preserve Details and Preserve Details 2.0 are proprietary upscaling algorithms; photoweb can expose equivalent vocabulary but will map them to its browser-safe bicubic smoother implementation unless a native-quality algorithm is added later.
