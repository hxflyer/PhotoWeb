# 05b Canvas Size — Gap Report

## Lessons reviewed

- `increasing-canvas-size-crop-tool-photoshop` — add transparent canvas around an image with the Crop Tool, then optionally place a Solid Color fill layer beneath the image for a photo border.

## Current photoweb coverage

- Image menu entry and shortcut: [MenuBar.tsx:336](../../../src/components/layout/MenuBar.tsx#L336) exposes `Image > Canvas Size…` with `⌘⌥C`; [App.tsx:425](../../../src/App.tsx#L425) wires `Cmd/Ctrl+Alt+C` to `openCanvasSizeDialog()`.
- Shortcut registry: [shortcuts.ts:46](../../../src/core/shortcuts.ts#L46) lists `Canvas Size…` as an Image shortcut.
- Dialog surface: [CanvasSizeDialog.tsx:49](../../../src/components/Dialogs/CanvasSizeDialog.tsx#L49) renders Current Size / New Size readouts, Width / Height inputs, a Relative checkbox, a 3x3 Anchor grid, Canvas Extension Color, OK, and Cancel.
- History-backed canvas resize: [documentSlice.ts:202](../../../src/store/documentSlice.ts#L202) guards the new dimensions and records a `Canvas Size` document command; [imageTransforms.ts:207](../../../src/core/imageTransforms.ts#L207) copies each layer into the new anchored canvas and fills non-transparent extension color first.
- Crop Tool activation and default bounds: [crop.ts:211](../../../src/tools/crop.ts#L211) initializes a crop rect on activation; [crop.ts:288](../../../src/tools/crop.ts#L288) renders the crop border, overlay grid, and handles.
- Crop Tool expand: [crop.ts:118](../../../src/tools/crop.ts#L118) resizes from handles and allows rectangles beyond document bounds; [crop.ts:432](../../../src/tools/crop.ts#L432) commits by drawing pixels with the crop offset, leaving new outside-canvas areas transparent.
- Crop Tool commit / cancel: [crop.ts:269](../../../src/tools/crop.ts#L269) maps Enter to commit and Escape to cancel; [OptionsBar.tsx:403](../../../src/components/Panels/OptionsBar.tsx#L403) exposes Crop options but not a checkmark/cancel pair.
- Existing tests: [cropTool.test.ts:112](../../../src/test/cropTool.test.ts#L112) verifies expansion creates transparent space; [transforms.test.ts:106](../../../src/test/transforms.test.ts#L106) covers anchored resize helper; [batchDDocumentDialogs.test.tsx:176](../../../src/test/batchDDocumentDialogs.test.tsx#L176) covers Canvas Size dialog readouts and Relative mode.

## Gaps

- Crop Tool `Shift` constrains to `1:1` in [crop.ts:133](../../../src/tools/crop.ts#L133), but the lesson’s corner-drag expansion preserves the original image aspect ratio when the user holds `Shift+Alt/Option`.
- Crop Tool lacks a direct test for the full Photoshop modifier choreography: mouse down on a corner, drag outward with `Shift+Alt/Option`, release mouse first, then commit with Enter.
- Canvas Size dialog has no width/height units dropdown despite the cluster contract naming units. Unit conversion helpers already exist in [units.ts:5](../../../src/utils/units.ts#L5), but the dialog is fixed to pixels.
- Canvas Extension Color options are limited to Transparent, White, and Black. Photoshop’s dialog offers more choices, including Gray and Foreground/Background/Other; adding Gray is low-risk, while Foreground/Background/Other depends on color-picker/store plumbing outside this tick.
- Crop Options Bar does not show Photoshop’s checkmark and cancel icons shown in `images/crop-and-straighten-add-canvas-photoshop-commit-crop-b71359c7.png` and `images/crop-and-straighten-add-canvas-photoshop-crop-cancel-button-ea302321.png`. Enter/Esc already work, so this is UI polish rather than a behavioral blocker.

## Photoshop-habit mismatches

- `Shift+Alt/Option` corner-drag should expand from center while keeping the original photo ratio, grounded by `images/crop-and-straighten-add-canvas-photoshop-add-canvas-original-ratio-6baae02c.jpg` and `images/crop-and-straighten-add-canvas-photoshop-canvas-added-original-ratio-b70960c6.jpg`; photoweb currently makes a square because Shift maps to `1:1`.
- Width and Height should be editable with units in the Canvas Size dialog, per the cluster contract and Photoshop Canvas Size vocabulary; photoweb currently shows hard-coded `px` labels in [CanvasSizeDialog.tsx:141](../../../src/components/Dialogs/CanvasSizeDialog.tsx#L141) and [CanvasSizeDialog.tsx:156](../../../src/components/Dialogs/CanvasSizeDialog.tsx#L156).
- The Crop Tool lesson’s Options Bar shows explicit Cancel and Commit controls in `images/crop-and-straighten-add-canvas-photoshop-crop-cancel-button-ea302321.png` and `images/crop-and-straighten-add-canvas-photoshop-commit-crop-b71359c7.png`; photoweb relies on keyboard commit/cancel for this tick.

## UI / UX issues

- The Canvas Size dialog is broadly usable but has compact web-form styling rather than Photoshop’s denser dialog layout. This tick should avoid a large visual rewrite and only add the missing unit affordance.
- The Crop Tool overlay extension area is transparent after commit, but while dragging it uses the same dark outside-crop dim as normal crop. The lesson screenshots show checkerboard transparency after the drag is released, not necessarily a different in-drag preview, so this is acceptable for now.

## Photoshop divergences worth keeping

- Photoshop can use native image/tile memory for extremely large canvases; photoweb caps document size and shows browser-memory warnings because the browser must allocate contiguous canvas buffers.
- Photoshop’s full Canvas Extension Color menu includes Foreground, Background, and Other; photoweb will continue with direct fill-style choices in this tick because color-picker integration is broader than Canvas Size behavior.
