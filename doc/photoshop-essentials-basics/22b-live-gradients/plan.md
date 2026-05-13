# 22b Live Gradients Plan

## Goals

### Feature: Gradient Mode Selector

**What it does** — The Gradient Tool Options Bar exposes `Gradient Mode` with `Gradient` and `Classic Gradient`. Classic preserves the existing pixel-gradient workflow; Gradient creates a non-destructive fill layer.

**Photoshop habit preserved** — Photoshop's 2023 Options Bar has the `Gradient Mode` dropdown, grounded by `2023-live-gradients-gradient-mode-option-88e47bfb.png`.

**Invocation** — Select Gradient Tool with `G`, choose `Gradient` or `Classic Gradient` from the Options Bar.

**Pre-conditions** — Gradient Tool active.

**Interaction choreography** — User selects the mode before drawing. The rest of the Options Bar controls remain active.

**Visual feedback** — The selected value remains visible in the Options Bar.

**Post-conditions** — Future gradient drags use the selected mode.

**Edge cases** — Switching mode does not discard the currently edited gradient stops.

### Feature: Non-Destructive Gradient Fill Layer

**What it does** — Drawing in `Gradient` mode creates a separate `Gradient Fill` layer with stored gradient type, stops, start/end points, dither, method, and smoothness. The original layer remains untouched.

**Photoshop habit preserved** — Live gradients create a `Gradient Fill` layer in the Layers panel, grounded by `2023-live-gradients-new-gradient-fill-layer-2c80cd6b.png`.

**Invocation** — Set Gradient Mode to `Gradient`, click-drag on the canvas, release.

**Pre-conditions** — A document exists. An editable pixel layer is not required because the result is a new layer.

**Interaction choreography** — Mouse down stores the start point; mouse move tracks the end point; mouse up creates a `Gradient Fill` layer above existing layers and keeps its handles live for further adjustment.

**Visual feedback** — The new layer appears and displays the gradient. The source layer's pixels are unchanged.

**Post-conditions** — One undoable layer-add entry exists, active layer is the Gradient Fill layer, and fill data stores the line geometry.

**Edge cases** — Shift-constrained endpoint is stored. Existing Classic Gradient tests continue to use the pixel path.

### Feature: Editable Live Fill Endpoints

**What it does** — After creating a Gradient Fill layer, dragging either endpoint handle updates the stored endpoint and repaints the fill layer without rasterizing it.

**Photoshop habit preserved** — Dragging live-gradient stops adjusts scale and angle, grounded by `2023-live-gradients-adjust-gradient-scale-on-canvas-controls-2ad63087.jpg` and `2023-live-gradients-rotate-gradient-angle-on-canvas-controls-b54f8613.jpg`.

**Invocation** — After creating a live Gradient Fill layer, drag an endpoint handle.

**Pre-conditions** — A live Gradient Fill layer was just created and its overlay handles are visible.

**Interaction choreography** — Pointer down near an endpoint selects it, pointer move changes that endpoint, pointer up leaves the adjusted fill layer active.

**Visual feedback** — Gradient pixels repaint in place and the fill layer data changes.

**Post-conditions** — The layer remains kind `fill`; no pixel-layer rasterization occurs.

**Edge cases** — Clicking away from handles starts a new gradient instead of corrupting the previous fill layer.

## Out-Of-Scope This Tick

- On-canvas midpoint diamonds, adding/deleting color stops from the live line, and double-click color editing.
- Full Properties panel controls for live gradients, including Noise type, reset alignment, opacity stop UI, and save preset from Properties.
- Dragging the connecting line to reposition the whole gradient.

## Files To Edit / Files To Create

- `src/tools/gradient.ts` — Gradient Mode option, fill-layer creation, endpoint-based fill data, live fill endpoint repainting.
- `src/core/fillLayer.ts` — render stored start/end gradient fill data with existing renderer.
- `src/components/Panels/OptionsBar.tsx` — Gradient Mode selector.
- `src/test/liveGradientSliceI.test.ts` — non-destructive fill-layer behavior and editable endpoints.
- `src/test/gradientEditor.test.tsx` — Options Bar mode selector regression.

## Test Cases

- Options Bar switches between `Gradient` and `Classic Gradient`.
- Gradient mode creates a separate `Gradient Fill` layer, leaves the source layer untouched, and stores start/end geometry.
- Dragging a live endpoint updates the fill layer endpoint data.
- Existing classic live-gradient preview, commit, cancel, and click-off tests remain green.

## Divergences From Photoshop

- Photoshop offers full on-canvas color stop, midpoint, and Properties panel editing; photoweb currently implements non-destructive fill creation plus endpoint scale/angle editing because that is the minimum layer-contract change needed before richer controls.
- Photoshop exposes angle/scale/position as Properties values; photoweb stores exact start/end points because the renderer is endpoint-driven.

## Stop Conditions Specific To This Cluster

- Stop if non-destructive Gradient Fill creation requires rewriting the layer model.
- Stop if classic gradient tests require weakening instead of selecting Classic Gradient explicitly.
