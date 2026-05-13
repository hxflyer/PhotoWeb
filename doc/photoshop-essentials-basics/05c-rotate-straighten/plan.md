# 05c-rotate-straighten Plan

## 1. Goals

### Feature 1 - Image Rotation menu completes Arbitrary

**What it does** - The Image Rotation submenu rotates the full document through Photoshop's standard entries: 180 degrees, 90 clockwise, 90 counter clockwise, Arbitrary, Flip Canvas Horizontal, and Flip Canvas Vertical. Arbitrary opens a small angle dialog; confirming applies one history entry to every layer and resizes the document bounds to contain the rotated pixels.

**Photoshop habit preserved** - Photoshop users expect this under `Image > Image Rotation`; the lesson references hand rotation and undo vocabulary, and the cluster explicitly includes Image Rotation. The relevant image/menu habit is grounded by `crop-and-straighten-rotate-straighten-photoshop-edit-undo-crop-6cf426b4.png` for top menu command/undo placement.

**Invocation** - `Image > Image Rotation > 180°`; `Image > Image Rotation > 90° Clockwise`; `Image > Image Rotation > 90° Counter Clockwise`; `Image > Image Rotation > Arbitrary...`; `Image > Image Rotation > Flip Canvas Horizontal`; `Image > Image Rotation > Flip Canvas Vertical`.

**Pre-conditions** - A document with at least one layer exists. Rotation commands are no-ops only for invalid arbitrary input or a zero-degree arbitrary confirmation.

**Interaction choreography**

1. User opens `Image > Image Rotation`.
2. Choosing 90/180/Flip immediately commits the transform and records one history entry.
3. Choosing `Arbitrary...` opens an angle dialog with focus in the numeric input.
4. `Enter` or `OK` confirms; `Esc`, `Cancel`, or outside click closes without changing pixels.
5. The canvas preview updates after commit; undo restores previous document dimensions and layer pixels.

**Visual feedback** - The document bounds change for non-right-angle arbitrary rotations, matching the expanded rotated image concept visible in `crop-and-straighten-rotate-straighten-photoshop-rotate-image-grid-lines-afada03f.jpg`.

**Post-conditions** - All layers are rotated or flipped, document dimensions update, dirty state/history update once with the command label.

**Edge cases** - Zero/near-zero arbitrary angle does nothing; non-finite input is ignored by the numeric dialog; 90/180 entries retain existing behavior; undo/redo round-trips dimensions and pixels.

### Feature 2 - Crop Tool Straighten supports button and Ctrl/Cmd temporary mode

**What it does** - With Crop active, clicking `Straighten` in the Options Bar arms a one-shot line drag; holding Ctrl on Windows or Command on Mac while dragging with Crop active temporarily uses the same Straighten line without changing the button state. Releasing the drag rotates the document by the correction needed to make the line nearest to horizontal or vertical.

**Photoshop habit preserved** - The Options Bar `Straighten` button is shown in `crop-and-straighten-rotate-straighten-photoshop-straighten-tool-dac48dae.png`. The lesson's quick tip states that with Crop Tool active, Ctrl/Command temporarily switches to the Straighten Tool.

**Invocation** - Toolbar `Crop Tool (C)` then Options Bar `Straighten`; or Toolbar `Crop Tool (C)` then hold Ctrl/Cmd and drag a line on canvas.

**Pre-conditions** - Crop Tool active; document open. A drag shorter than the threshold does not rotate.

**Interaction choreography**

1. User selects Crop (`C` or toolbar).
2. User clicks `Straighten`, or presses/holds Ctrl/Cmd while Crop is active.
3. Pointer down sets the line start with a crosshair-style cursor.
4. Drag updates a thin line between start and current pointer, as in `crop-and-straighten-rotate-straighten-photoshop-straigten-tool-draw-line-9701e5df.jpg`.
5. Pointer up computes the nearest-axis correction, commits one rotation history entry, clears the one-shot Straighten mode, and requests a canvas redraw.
6. `Esc` cancels an active line and returns to the normal crop rectangle without committing.

**Visual feedback** - The temporary line is visible during the drag; after release, the document appears rotated like `crop-and-straighten-rotate-straighten-photoshop-straighten-tool-image-rotated-1dfd5e24.jpg`.

**Post-conditions** - The document has one rotate history entry; the Crop Straighten toggle resets to off; the crop rectangle is reinitialized for the new canvas size.

**Edge cases** - Zero-size or very short drag cancels; Ctrl/Cmd can be pressed before the pointer down; vertical guides straighten to vertical rather than forcing horizontal; undo/redo restores pre-straighten dimensions.

### Feature 3 - Ruler Tool measures, edits endpoints, and Straightens Layer

**What it does** - The toolbar Eyedropper group gains `Ruler Tool (I)`. The Ruler Tool lets users draw a persistent line, drag either endpoint afterward to correct it, clear it from the Options Bar, and click `Straighten Layer` to rotate the active layer around its center while preserving document dimensions. Transparent corners remain, matching Photoshop's Ruler Tool workflow before the user crops them away.

**Photoshop habit preserved** - `crop-and-straighten-rotate-straighten-photoshop-ruler-tool-3a34fe6e.png` shows Ruler nested behind Eyedropper. `crop-and-straighten-rotate-straighten-ruler-tool-starting-point-off-691bfc1a.jpg` and `...starting-point-corrected-5b42b0fd.jpg` show endpoint correction. `crop-and-straighten-rotate-straighten-photoshop-ruler-tool-straighten-layer-e9aa7401.png` shows the Options Bar `Straighten Layer` and `Clear` buttons. `crop-and-straighten-rotate-straighten-photoshop-straighten-image-ruler-tool-d4d253a0.jpg` shows transparent corners after straightening.

**Invocation** - Right-click / press-and-hold Eyedropper group, choose `Ruler Tool`; `I` activates Eyedropper and `Shift+I` cycles to Ruler; Options Bar `Straighten Layer`; Options Bar `Clear`.

**Pre-conditions** - A document is open. `Straighten Layer` requires an active layer and a line longer than the drag threshold; otherwise it is a no-op/disabled.

**Interaction choreography**

1. User selects Ruler Tool from the Eyedropper flyout or with `Shift+I`.
2. Pointer down away from an existing endpoint starts a new measurement.
3. Drag previews a thin line with endpoint handles; pointer up leaves the line on canvas.
4. Pointer down near either endpoint enters endpoint-drag mode; moving adjusts only that endpoint.
5. `Clear` removes the measurement without history.
6. `Straighten Layer` computes the nearest-axis correction from the current line, rotates the active layer in place, records one `Straighten Layer` history step, and leaves transparent corners visible.
7. `Esc` clears the measurement; undo/redo affects only committed straightening, not measurement placement.

**Visual feedback** - The measurement line and endpoints match the lesson's Ruler screenshots; after straightening, the layer shows transparency in the corners like `crop-and-straighten-rotate-straighten-photoshop-straighten-image-ruler-tool-d4d253a0.jpg`.

**Post-conditions** - The active layer pixels are rotated in place; document width/height are unchanged; history has one `Straighten Layer` entry; measurement line remains available until cleared.

**Edge cases** - Starting a new drag replaces the prior line; endpoint hit target scales with zoom; tiny line cannot straighten; no active layer leaves pixels unchanged; Shift+I cycles inside the Eyedropper/Ruler group.

## 2. Out-of-scope-this-tick

- Full Crop Tool crop-border free rotation outside the crop rectangle, auto-resizing crop bounds, rule-of-thirds/detail-grid switching during crop rotation, and crop commit composition are deferred to `06-crop`.
- Photoshop's full Ruler measurement readouts (X/Y/W/H/A fields, measurement log, units, measurement scale calibration) are deferred; this cluster only needs the straightening workflow.

## 3. Files to edit / files to create

- Feature 1: `src/components/layout/MenuBar.tsx`, `src/App.tsx`, `src/test/05c-rotate-straighten.test.tsx`.
- Feature 2: `src/tools/crop.ts`, `src/test/05c-rotate-straighten.test.tsx`.
- Feature 3: `src/core/imageTransforms.ts`, `src/store/documentSlice.ts`, `src/store/types.ts`, new `src/tools/ruler.ts`, `src/tools/stubs.ts`, `src/components/Panels/Toolbar.tsx`, `src/components/Panels/OptionsBar.tsx`, `src/App.tsx`, `src/test/05c-rotate-straighten.test.tsx`.
- Artifacts: `doc/photoshop-essentials-basics/05c-rotate-straighten/gap-report.md`, `doc/photoshop-essentials-basics/05c-rotate-straighten/plan.md`, `doc/photoshop-essentials-basics/divergence-log.md`, `doc/photoshop-essentials-basics/work-queue.md`.

## 4. Test cases

- Feature 1: simulator test opens the Image Rotation menu, chooses `Arbitrary...`, enters an angle, confirms, and asserts document dimensions/history changed.
- Feature 1: store/core test asserts undo/redo restores arbitrary-rotation document dimensions.
- Feature 2: tool-level simulator-style test selects Crop and performs a Ctrl/Cmd straighten drag; asserts the crop option toggle did not need to be armed and the document rotated.
- Feature 2: tool-level test draws a near-vertical guide and asserts correction aligns to the nearest vertical axis.
- Feature 3: simulator test uses `Shift+I` to activate Ruler Tool, drags a measurement, clicks `Straighten Layer`, and asserts active layer pixels changed while document dimensions stayed fixed.
- Feature 3: tool-level test drags a Ruler endpoint after the initial line and asserts the stored measurement updates before straightening.

## 5. Divergences from Photoshop

- Photoshop's Crop Tool automatically resizes the crop border and commits a crop after Straighten; photoweb rotates the document for this tick because complete Crop Tool crop-box choreography belongs to `06-crop`.
- Photoshop's Ruler Options Bar exposes full measurement readouts and measurement-scale behavior; photoweb shows only `Use Measurement Scale`, `Straighten Layer`, and `Clear` because measurement logging/calibration is outside this cluster's photo-straightening goal.

## 6. Stop conditions specific to this cluster

- Stop if adding Ruler Tool requires restructuring Viewport event dispatch beyond normal Tool registry hooks.
- Stop if Crop Tool full rotate/crop-box behavior becomes necessary for tests, because that crosses into `06-crop`.
- Stop if arbitrary rotation dialog work requires replacing the shared dialog system.
