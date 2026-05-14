# 26a Shape Concepts Plan

## Goals

### Feature: Shape Tool Mode Clarity

**What it does** — The Options Bar exposes Shape, Path, and Pixels modes with stable controls and clear Photoshop vocabulary.

**Photoshop habit preserved** — Users choose the output kind before drawing with a Shape tool.

**Invocation** — Select any Shape tool and click Shape, Path, or Pixels in the Options Bar.

**Post-conditions** — The next drag uses the chosen output mode.

### Feature: Three Output Surfaces

**What it does** — Shape mode creates a vector Shape layer, Path mode creates a stored path and no layer, and Pixels mode paints onto the active layer.

**Photoshop habit preserved** — The three shape drawing modes remain materially different, not just UI labels.

**Invocation** — Drag the Rectangle tool in each mode.

**Post-conditions** — Shape layer, path store, or raster pixels are updated respectively.

### Feature: Pixels Mode Undo

**What it does** — Pixel-based shape drawing records a pixel history action.

**Photoshop habit preserved** — Fill Pixels mode behaves like a raster paint operation and can be undone.

**Invocation** — Draw a shape in Pixels mode, then undo.

**Post-conditions** — The raster pixels return to their pre-draw state.

### Feature: Free Transform Path Label

**What it does** — The Edit menu labels the transform command as `Free Transform Path` for active Shape layers.

**Photoshop habit preserved** — Photoshop names the command according to whether the active content is vector/path or raster pixels.

**Invocation** — Select a Shape layer and open the Edit menu.

**Post-conditions** — The menu shows `Free Transform Path`.

## Files Edited / Created

- `src/components/Panels/OptionsBar.tsx` — Tool Mode test ids and titles.
- `src/tools/shapes.ts` — undoable Pixels mode drawing.
- `src/components/layout/MenuBar.tsx` — shape-aware Free Transform label.
- `src/test/26a-shape-concepts.test.tsx` — focused regressions.

## Test Cases

- Options Bar exposes Shape / Path / Pixels controls and active mode state.
- Shape mode creates a Shape layer with structured shape data.
- Path mode creates a stored path and no layer.
- Pixels mode paints onto the active raster layer and undo restores previous pixels.
- Edit menu shows `Free Transform Path` for Shape layers.

## Divergences From Photoshop

- None introduced.
