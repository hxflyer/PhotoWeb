# 25b Type / Shape Interop Plan

## Goals

### Feature: Custom Shape Path Mode

**What it does** — Custom Shape Tool `Path` mode creates a stored editable path from the selected preset instead of adding a shape layer.

**Photoshop habit preserved** — Users can draw a custom shape as a path before placing text inside it.

**Invocation** — Select Custom Shape Tool, choose a preset, set mode to `Path`, then drag on the canvas.

**Post-conditions** — The path store receives a closed path and no layer is added.

### Feature: Type Inside A Closed Path

**What it does** — Clicking inside a closed path with the Type Tool creates text constrained to that path.

**Photoshop habit preserved** — The Type cursor changes behavior based on path context: on the edge creates type-on-path; inside creates a text frame.

**Invocation** — Draw a closed path, press `T`, then click inside the path.

**Post-conditions** — A Type layer stores `textMode: 'shape'`, a copied closed path, and rasterizes clipped/wrapped text.

### Feature: Convert Type To Shape

**What it does** — Existing Layer > Type > Convert to Shape and Properties-panel Convert to Shape paths remain the route from editable Type layer to custom Shape layer.

**Photoshop habit preserved** — Converted type is no longer editable text and becomes a shape layer.

**Invocation** — Select a Type layer, choose Layer > Type > Convert to Shape or the Properties panel button.

**Post-conditions** — The layer becomes `kind: 'shape'`, stores custom shape data, and undo restores the original Type layer.

## Files Edited / Created

- `src/tools/shapes.ts` — Custom Shape Path mode converts preset SVG paths into editable path anchors.
- `src/tools/pen.ts` — closed-path interior hit-testing for Type Tool integration.
- `src/tools/type.ts` — shape text mode, interior path hit creation, and clipped/wrapped shape-text rasterization.
- `src/components/Canvas/TypeOverlayMount.tsx` — shape text edits use the box editor and avoid duplicate CSS preview.
- `src/test/25b-type-shape-interop.test.tsx` — focused regressions.

## Test Cases

- Custom Shape Tool Path mode creates a closed stored path and no layer.
- Clicking inside a closed path with the Type Tool creates `textMode: 'shape'` data and visible clipped text.
- Convert to Shape turns a type layer into a custom shape layer and undo restores type data.
- Existing type-on-path, Pen Shape mode, and Properties panel conversion tests stay green.

## Divergences From Photoshop

- SVG arc commands in Custom Shape Path mode are approximated as editable line segments because photoweb stores Pen-style anchors rather than browser-native `Path2D` arcs.
- Text inside arbitrary paths uses clipped paragraph layout within path bounds because browser Canvas2D does not expose Photoshop's full text composer for concave path interiors.
