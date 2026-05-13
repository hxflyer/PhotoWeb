# 05a-image-size plan

## 1. Goals

### Feature spec A — Image Size dialog mirrors Photoshop's pixel/print math

**What it does** — The Image Size dialog shows the current and proposed memory size, pixel dimensions, Fit To presets, editable Width/Height with unit menus, Resolution in pixels/inch, Constrain Proportions, Resample, method selection, Reset, Cancel, and OK. With Resample on, Width/Height change document pixels. With Resample off, pixel dimensions remain fixed and Width/Height/Resolution update each other as print-size metadata.

**Photoshop habit preserved** — `Image > Image Size...`, `Ctrl+Alt+I` / `Command+Option+I`, title `Image Size`, `Dimensions`, `Fit To`, `Width`, `Height`, `Resolution`, `Resample`, chain-link constrain button, `Reset`, `Cancel`, and `OK`, grounded by `image-size-resolution-image-size-dialog-box-photoshop-image-size-dialog-box-b50acf75.jpg`, `image-size-resolution-image-size-dialog-box-width-height-resolution-resample-94d2c29e.png`, and `image-size-resolution-image-size-dialog-box-image-size-ok-cancel-buttons-0eab9d24.jpg`.

**Invocation** — Image menu: `Image > Image Size...`; keyboard: `Ctrl+Alt+I` on Windows/Linux and `Command+Option+I` on Mac; app bridge: `data-imagesize` hook used by existing menu/shortcut tests.

**Pre-conditions** — A document exists with positive pixel width/height. If no document exists or proposed pixel dimensions are invalid, OK is disabled. Browser maximum pixel guard remains enforced in the store.

**Interaction choreography**

1. User opens `Image > Image Size...`; default cursor remains arrow, focus moves into the dialog, and the Width field is editable.
2. With Resample checked, Width/Height unit menus include Pixels, Percent, Inches, Centimeters, and Millimeters. Typing a Width with the chain linked updates Height immediately; pressing Enter or blurring commits the normalized value. With the chain unlinked, the other field stays unchanged.
3. Changing Width/Height units preserves the underlying proposed pixel count and only changes the displayed value. Percent is relative to the original opened size.
4. Unchecking Resample keeps `Dimensions` and Image Size memory fixed, disables Pixels for Width/Height, switches those unit menus to Inches if needed, and leaves Resolution editable.
5. With Resample unchecked and the chain linked, typing Width recalculates Resolution from fixed pixel width and updates Height from fixed pixel height at the same resolution. Typing Resolution recalculates displayed Width/Height but does not change pixels or Image Size memory.
6. Fit To applies Photoshop-style preset values. Web presets set pixel dimensions with Resample on; print presets set inches plus 300 ppi and keep the chain linked.
7. Reset restores the values from when the dialog opened. Cancel closes without a history step. OK creates one `Image Size` history step; undo/redo restores pixels and resolution.

**Visual feedback** — The right column follows the Photoshop stacked readout and field order from `image-size-resolution-image-size-dialog-box-photoshop-image-size-dialog-box-b50acf75.jpg`; proposed memory shows `Image Size: new (was old)` like `image-size-resolution-image-size-dialog-box-image-size-ok-cancel-buttons-0eab9d24.jpg`; the Resample-off state matches `image-size-resolution-image-size-dialog-box-turn-resample-off-4b807d9a.png`.

**Post-conditions** — With Resample on, all layers are resampled to the proposed width/height, document width/height update, resolution updates if changed, and a single undo entry named `Image Size` is added. With Resample off, layer canvases and document pixel dimensions stay unchanged, resolution updates, and a single `Image Size` undo entry is added.

**Edge cases** — Invalid or zero numbers revert to the last valid display value; percent values below one output pixel are clamped by validation; Pixels cannot be selected while Resample is off; unchecking Resample after entering pixel dimensions returns the proposed pixel dimensions to the original current pixels; browser pixel ceilings remain guarded by the store.

### Feature spec B — Photoshop interpolation vocabulary including pixel-art and upscaling choices

**What it does** — The Resample method list uses Photoshop vocabulary, adding `Preserve Details (enlargement)`, `Preserve Details 2.0`, and `Nearest Neighbor (hard edges)`. Preserve Details choices route through photoweb's deterministic smoother upsampling path for now; Nearest Neighbor continues to use the existing block-preserving path.

**Photoshop habit preserved** — Pixel-art users choose `Nearest Neighbor (hard edges)` from the same Resample menu shown in `image-size-resolution-resize-pixel-art-nearest-neighbor-interpolation-27b2c44e.png`; upscaling users can choose `Preserve Details 2.0` as shown in `2018-preserve-details-2-photoshop-choose-preserve-details-2.0-a039d31d.png`.

**Invocation** — Open Image Size, keep Resample checked, open the Resample method menu, choose a method, then click OK.

**Pre-conditions** — Resample is checked. The method select is disabled when Resample is unchecked, matching Photoshop screenshots.

**Interaction choreography**

1. User opens the method dropdown with the arrow cursor.
2. Selecting `Nearest Neighbor (hard edges)` keeps pixel-art colors blocky during enlargement and exact-size workflows.
3. Selecting `Preserve Details (enlargement)` or `Preserve Details 2.0` keeps the Photoshop menu vocabulary available and uses the same smoother resampling backend as the current browser implementation.
4. OK applies the chosen method in the same `Image Size` history step.

**Visual feedback** — The dropdown labels match the Photoshop list in `image-size-resolution-image-size-dialog-box-photoshop-image-interpolation-methods-ff4bba8d.png`.

**Post-conditions** — Resampled layers match the requested pixel dimensions; nearest-neighbor tests prove hard-edged pixel blocks remain crisp.

**Edge cases** — Automatic still chooses smoother for enlargement and sharper for reduction; Preserve Details choices are deterministic aliases, not AI/cloud upscalers.

### Feature spec C — Document resolution reaches New Document and Status Bar

**What it does** — New documents keep the resolution selected in the New Document dialog, Image Size can change that resolution, undo/redo restores it, and Status Bar Document Dimensions reports the actual ppi instead of hard-coded 72.

**Photoshop habit preserved** — Photoshop's status bar Document Dimensions reports document dimensions with the current resolution, grounded by the previous 01a status-bar contract and the Image Size resolution screenshots `image-size-resolution-pixels-imagesize-resolution-current-image-resolution-eaae4216.png`.

**Invocation** — File > New with a Resolution value; Image > Image Size with Resample off and a changed Resolution; status bar info mode `Document Dimensions`.

**Pre-conditions** — Document exists. Resolution is a positive finite number; invalid entries revert to the current value.

**Interaction choreography**

1. User creates a new document with a ppi value; document state stores it.
2. User opens Image Size, changes Resolution, and clicks OK.
3. Status bar immediately reflects the new ppi in Document Dimensions mode.
4. Undo restores the previous ppi; redo reapplies the new ppi.

**Visual feedback** — Status bar text changes from `800 px x 600 px (72 ppi)` to the active document's ppi value.

**Post-conditions** — `state.resolution` is in sync with the dialog and status bar.

**Edge cases** — Opening bitmap files defaults to 72 ppi; closing/resetting a document returns the fallback to 72 ppi.

## 2. Out-of-scope-this-tick

- Photoshop's Window-menu trick for matching another open document is out of scope because photoweb is single-document per CLAUDE.md §4.
- The Image Size preview window will be represented structurally but not full Photoshop-quality pan/zoom preview in this tick; exact preview manipulation is polish, while the pixel/resolution math is the core behavior.
- Print-production workflows beyond ppi/print-size math remain out of scope.

## 3. Files to edit / files to create

- Feature A/B: [ImageSizeDialog.tsx](../../../src/components/Dialogs/ImageSizeDialog.tsx), [imageTransforms.ts](../../../src/core/imageTransforms.ts), [documentSlice.ts](../../../src/store/documentSlice.ts), [types.ts](../../../src/store/types.ts), [App.tsx](../../../src/App.tsx).
- Feature C: [NewDocumentDialog.tsx](../../../src/components/Dialogs/NewDocumentDialog.tsx), [StatusBar.tsx](../../../src/components/layout/StatusBar.tsx), [history.ts](../../../src/core/history.ts), [historySlice.ts](../../../src/store/historySlice.ts).
- Tests: create [05a-image-size.test.tsx](../../../src/test/05a-image-size.test.tsx), update existing image-size assertions in [batchDDocumentDialogs.test.tsx](../../../src/test/batchDDocumentDialogs.test.tsx) if needed.
- Artifacts: this `gap-report.md`, this `plan.md`, append [divergence-log.md](../divergence-log.md).

## 4. Test cases

- Feature A: simulator-driven `Cmd/Ctrl+Alt+I` opens Image Size; entering Width while linked updates Height, clicking OK resamples the store, and one `Image Size` history entry is created.
- Feature A/C: simulator-driven Resample-off flow changes Resolution to 72 ppi, confirms, leaves pixel dimensions unchanged, updates status bar text, and undo/redo restores resolution.
- Feature B: dialog method list includes Photoshop labels including `Preserve Details 2.0` and `Nearest Neighbor (hard edges)`; nearest-neighbor pixel-art resize preserves 2x2 source blocks when upscaled.
- Feature C: New Document with a custom Resolution stores that ppi in document state; `.pwbdoc` save/load preserves current resolution and falls back to 72 ppi for older manifests.

## 5. Divergences from Photoshop

- Photoshop can use Image Size plus the Window menu to match another open document; photoweb does not because CLAUDE.md §4 excludes multi-document UI.
- Photoshop's Preserve Details and Preserve Details 2.0 use Adobe's proprietary upscaling algorithms; photoweb maps those labels to deterministic browser bicubic-smoother resampling because external AI/cloud or proprietary native algorithms are outside scope.

## 6. Stop conditions specific to this cluster

- Stop if unit math requires rewriting the transform/history architecture instead of a scoped resolution snapshot addition.
- Stop if simulator-driven tests cannot exercise the dialog keyboard/menu path.
- Stop if implementing a true multi-document match-size workflow becomes necessary; that conflicts with CLAUDE.md §4.
