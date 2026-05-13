# 05b Canvas Size — Plan

## Goals

### Feature Spec 1 — Canvas Size Dialog Units

**What it does** — The Canvas Size dialog lets a user enter Width and Height in Photoshop-style units instead of being locked to pixels. Pixels remain the default and existing math-expression behavior stays intact; selecting Percent, Inches, Centimeters, or Millimeters updates the displayed values and commits rounded pixel dimensions.

**Photoshop habit preserved** — Photoshop users expect `Image > Canvas Size…` to expose Width, Height, Relative, Anchor, and Canvas Extension Color in one dialog. This keeps that vocabulary and adds the missing units control from the cluster contract while preserving the `Image > Canvas Size…` / `Cmd/Ctrl+Alt+C` entry path. The dialog-side habit is grounded by the lesson’s Canvas Size topic and the extension result screenshots such as `images/crop-and-straighten-add-canvas-photoshop-add-canvas-space-0b47bdea.jpg`.

**Invocation** — `Image > Canvas Size…`; `Cmd/Ctrl+Alt+C`; OK applies the new canvas size; Cancel, Escape, or backdrop click closes without applying.

**Pre-conditions** — A document exists. The command is allowed for any raster document and affects all layers. Invalid or zero resulting dimensions are clamped to at least 1 pixel and the store-level browser memory guard may refuse oversize dimensions.

**Interaction choreography**

1. User opens `Image > Canvas Size…` or presses `Cmd/Ctrl+Alt+C`; the modal opens with focus inside the dialog.
2. User chooses a unit from the Width/Height unit dropdown; Width and Height values are converted from the previous unit without changing the computed canvas size.
3. User edits Width or Height. Math expressions still parse; in Percent, 120 means 120% of the current dimension when Relative is off.
4. User checks Relative; fields reset to 0 in the selected unit. In Percent, 20 means add 20% of the current dimension.
5. User picks an anchor cell; arrows update around the anchor.
6. User chooses Canvas Extension Color; Transparent, White, Black, and Gray are available.
7. OK creates one `Canvas Size` history step. Cancel/Escape closes without a history step.

**Visual feedback** — Current Size and New Size readouts update live. The resulting extension is transparent or filled according to the Canvas Extension Color, matching the lesson’s transparent crop result in `images/crop-and-straighten-add-canvas-photoshop-add-canvas-space-0b47bdea.jpg`.

**Post-conditions** — Store `width` and `height` are updated, every layer canvas is resized with the chosen anchor and extension color, and history records one undoable `Canvas Size` command.

**Edge cases** — Empty or invalid text reverts on blur; resulting dimensions clamp to 1; Percent uses the current document width for width and current document height for height; browser memory guard can reject very large results; unit switching should not introduce dimension drift beyond normal rounded-pixel conversion.

### Feature Spec 2 — Crop Tool Centered Original-Ratio Canvas Expansion

**What it does** — A Crop Tool corner drag beyond the canvas with `Shift+Alt/Option` expands the crop rectangle from its center while preserving the starting document aspect ratio. Committing with Enter increases the canvas and leaves the added areas transparent.

**Photoshop habit preserved** — The lesson explicitly teaches selecting the Crop Tool with `C`, dragging handles outward, holding `Alt/Option` to resize from center, and holding `Shift+Alt/Option` on a corner to keep the original aspect ratio. This is grounded by `images/crop-and-straighten-add-canvas-crop-tool-photoshop-cc-514ca68d.png`, `images/crop-and-straighten-add-canvas-photoshop-initial-crop-border-d0ca2811.jpg`, and `images/crop-and-straighten-add-canvas-photoshop-add-canvas-original-ratio-6baae02c.jpg`.

**Invocation** — Toolbar Crop Tool; keyboard `C`; drag any crop corner handle; hold `Alt/Option` for center expansion; add `Shift` to keep the original ratio; Enter/Return or the commit control applies; Esc or Cancel abandons.

**Pre-conditions** — Crop Tool is active and a document is open. A crop rectangle exists, initially snapped to document bounds. This tick does not implement Background-layer conversion because `07b-background-layer` owns full Background-layer behavior.

**Interaction choreography**

1. User presses `C`; cursor uses the Crop Tool’s default pointer and the crop border appears around the document with eight handles.
2. User presses on a corner handle. The crop rectangle is captured as the gesture base.
3. User holds `Alt/Option`; dragging mirrors the pulled corner across the rectangle center.
4. User also holds `Shift`; the rectangle keeps the base aspect ratio while growing from center.
5. User releases the mouse before releasing modifiers, matching the lesson’s warning.
6. User presses Enter/Return; one `Crop` history step updates the document dimensions and added space remains transparent.
7. User presses Esc before committing; the active crop rectangle is cleared and no history step is created.

**Visual feedback** — The crop overlay remains visible during the drag with rule-of-thirds lines and handles, matching `images/crop-and-straighten-add-canvas-photoshop-add-canvas-original-ratio-6baae02c.jpg`. After commit, transparent canvas surrounds the photo as in `images/crop-and-straighten-add-canvas-photoshop-canvas-added-original-ratio-b70960c6.jpg`.

**Post-conditions** — The committed crop updates store `width` and `height`, layer canvases match those dimensions, original pixels are shifted into the new canvas, new regions are transparent, and undo/redo round-trips the crop.

**Edge cases** — Minimum crop size remains enforced; dragging side handles with `Shift+Alt/Option` preserves the active ratio but this tick specifically tests corner expansion; Delete Cropped Pixels behavior is left as-is for full `06-crop`; pointer coordinates can exceed original document bounds.

## Out-of-scope-this-tick

- Full Crop Tool overhaul: checkmark/cancel Options Bar icons, Classic Mode, Delete Cropped Pixels non-destructive behavior, overlay presets polish, and straightening belong to `06-crop` / `05c-rotate-straighten`.
- Background-layer conversion semantics belong to `07b-background-layer`.
- Foreground/Background/Other Canvas Extension Color plumbing requires broader color picker integration and is deferred.

## Files to edit / files to create

- Feature Spec 1: edit [CanvasSizeDialog.tsx](../../../src/components/Dialogs/CanvasSizeDialog.tsx); add tests in [05b-canvas-size.test.tsx](../../../src/test/05b-canvas-size.test.tsx).
- Feature Spec 2: edit [crop.ts](../../../src/tools/crop.ts); add tests in [05b-canvas-size.test.tsx](../../../src/test/05b-canvas-size.test.tsx).
- Artifacts: create this plan and [gap-report.md](gap-report.md); update [work-queue.md](../work-queue.md) after implementation commit.

## Test Cases

- Feature Spec 1: simulator-driven `Cmd/Ctrl+Alt+C` opens Canvas Size, switching unit to Percent and entering 120 commits a 120% canvas through the real App/dialog path.
- Feature Spec 1: unit switching from Pixels to Inches preserves the computed pixel size, then OK commits the same size.
- Feature Spec 2: tool-level simulator test drags the southeast crop handle outward with `Shift+Alt/Option`, asserts the live crop rect preserves the original 100:80 ratio from center, presses Enter, and verifies transparent extension pixels.
- Feature Spec 2: Escape after an outward drag cancels without changing store dimensions or history.

## Divergences From Photoshop

- Photoshop offers Foreground, Background, and Other in Canvas Extension Color; photoweb offers direct fixed choices here because opening and applying the shared Color Picker from this dialog is broader than the Canvas Size behavior in this tick.
- Photoshop’s native engine supports much larger canvas allocations; photoweb enforces browser memory limits because HTML canvas buffers are allocated in browser memory.

## Stop Conditions Specific To This Cluster

- Stop if the Crop Tool fix requires a broad overlay/Options Bar rewrite.
- Stop if Canvas Size units require document-resolution state beyond the existing 72 DPI unit helper.
- Stop if tests need to weaken existing crop or transform assertions.
