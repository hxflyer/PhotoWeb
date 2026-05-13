# 08b Properties Panel Plan

## Goals

### Feature 1 — Background Document Properties

**What it does** — When the active layer is the real Background layer, the Properties panel shows document size, resolution, color mode, and quick actions for Image Size, Crop, Trim, and Rotate 90°.

**Photoshop habit preserved** — Selecting Background turns Properties into a document-level command surface.

**Invocation** — Select the Background layer, then use the Properties panel.

**Post-conditions** — Existing dialog/tool/document commands are invoked through the Properties panel.

### Feature 2 — Pixel Layer Transform / Align

**What it does** — Non-Background raster layers expose X/Y/W/H pixel-content transform controls, Rotate 90°, Flip H/V, Align/Distribute, and single-layer canvas alignment.

**Photoshop habit preserved** — Pixel layer Properties includes Transform and Align/Distribute groups.

**Invocation** — Select a raster layer, or multi-select raster layers for align/distribute.

**Post-conditions** — Layer content moves/resizes/rotates/flips through undoable document commands; align-to-canvas works for one layer.

### Feature 3 — Expanded Type Properties

**What it does** — Type layers expose transform fields, Character fields (leading, tracking, scaling, baseline, anti-aliasing), Paragraph fields (indents and spacing), Type Options (caps, superscript/subscript, hyphenation), and Convert to Shape.

**Photoshop habit preserved** — Properties mirrors the most common Character and Paragraph panel controls when a type layer is selected.

**Invocation** — Select a type layer and edit the Properties panel fields.

**Post-conditions** — Type data/style patches remain undoable via the existing type command helpers.

## Out Of Scope This Tick

- Convert to Frame remains disabled because there is no Frame layer model.
- Select Subject and Remove Background quick actions are omitted because AI/object-selection services are out of scope.
- Full Rulers & Grids / Guides Properties groups are deferred.

## Files To Edit / Files To Create

- `src/components/Panels/PropertiesPanel.tsx`
- `src/store/layersSlice.ts`
- `src/store/types.ts`
- `src/test/08b-properties-panel.test.tsx`
- `doc/photoshop-essentials-basics/08b-properties-panel/gap-report.md`
- `doc/photoshop-essentials-basics/08b-properties-panel/plan.md`

## Test Cases

- Background Properties quick actions open Image Size, select Crop, open Trim, and rotate the canvas.
- Pixel layer Properties moves/resizes/flips layer content through store actions.
- Single raster layer aligns to canvas center from Properties.
- Type Properties updates transform/style fields and Convert to Shape rewrites the layer to a custom shape.

## Divergences From Photoshop

- Convert to Frame is visible but disabled.
- Background Rulers & Grids / Guides and pixel-layer AI quick actions are not included.

## Stop Conditions

- Stop if Properties transform controls bypass history, if Background quick actions regress existing menu commands, or if existing Character/Paragraph/Shape/Effects tests fail.
