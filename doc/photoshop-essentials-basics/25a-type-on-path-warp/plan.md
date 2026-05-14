# 25a Type On Path / Warp Text Plan

## Goals

### Feature: Shape Tool Path Mode

**What it does** — Shape tools set to `Path` create stored vector paths instead of shape layers or pixels.

**Photoshop habit preserved** — Users can draw an ellipse or line path first, then switch to the Type Tool and click the path.

**Invocation** — Select a Shape tool, choose `Path` mode in the Options Bar, then drag on the canvas.

**Post-conditions** — A path appears in the path store and no layer is added.

### Feature: Type On A Path

**What it does** — The Type Tool detects stored path segments and creates type that rasterizes along the path.

**Photoshop habit preserved** — Click a path with the Type Tool to begin typing along it.

**Invocation** — Create a Pen or Shape path, press `T`, then click the path.

**Post-conditions** — A Type layer stores `textMode: 'path'`, a copied path, start offset, and flipped-side state.

### Feature: Direct Selection Handles For Path Type

**What it does** — Direct Selection can drag the start/end handles of type-on-path text and flip the text to the other side by dragging across the path.

**Photoshop habit preserved** — The `A` tool family adjusts path-type placement instead of requiring a separate dialog.

**Invocation** — Select Direct Selection and drag a type-on-path start or end handle.

**Post-conditions** — The layer re-rasterizes with updated path offsets and side.

### Feature: Warp Text Dialog

**What it does** — The Type Options Bar Warp Text icon opens a dialog with Photoshop-style warp presets, orientation, Bend, Horizontal Distortion, and Vertical Distortion controls.

**Photoshop habit preserved** — Type warps remain editable on the Type layer and preview while the dialog is open.

**Invocation** — Select a Type layer, choose the Type Tool, click the T-with-arc icon, adjust settings, then OK or Cancel.

**Post-conditions** — OK records one undoable type-layer edit; Cancel restores the prior warp.

## Files Edited / Created

- `src/tools/shapes.ts` — Path mode now creates stored paths for geometric shape tools.
- `src/tools/pen.ts` — shared path clone and segment hit-test helpers.
- `src/tools/type.ts` — `path` text mode, type-on-path hit creation, path-text rasterization, and path handle helpers.
- `src/tools/pathSelection.ts` — Direct Selection support for type-on-path start/end handles.
- `src/components/Panels/OptionsBar.tsx` — Warp Text dialog and live preview wiring.
- `src/components/Canvas/TypeOverlayMount.tsx` — skip flat CSS duplicate preview for path-text layers.
- `src/utils/textWarp.ts` — horizontal vs vertical warp orientation handling.
- `src/test/25a-type-on-path-warp.test.tsx` — focused regressions.

## Test Cases

- Shape Tool `Path` mode creates a stored path and no layer.
- Clicking a stored path with the Type Tool creates `textMode: 'path'` data and rasterizes visible pixels.
- Direct Selection moves a type-on-path start handle and flips side across the path.
- Warp Text dialog writes style, orientation, bend, and distortion settings to the Type layer.
- Existing Warp Text rasterization, Pen Shape mode, path-selection, and Type Options Bar tests stay green.

## Divergences From Photoshop

- Custom Shape Tool `Path` mode remains deferred until the custom-shape preset cluster because editable SVG path parsing is a separate geometry parser.
