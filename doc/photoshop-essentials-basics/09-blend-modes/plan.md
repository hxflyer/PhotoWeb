# 09 Blend Modes Plan

## Goals

### Feature 1 — Photoshop Blend Mode IDs

**What it does** — Represents layer blend modes as Photoshop mode ids and exposes the full 27-mode list in Photoshop order.

**Photoshop habit preserved** — The Layers panel menu contains Normal, Dissolve, Darken through Luminosity in the same grouped order users know.

**Post-conditions** — Layer state, history snapshots, persistence, and document transfer keep stable mode ids instead of collapsing custom modes to Normal.

### Feature 2 — Custom Mode Compositing

**What it does** — Routes layer compositing through a blend resolver that uses Canvas2D native operations when available and per-pixel math for Photoshop-only modes.

**Photoshop habit preserved** — Linear Burn, Linear Dodge, Vivid Light, Linear Light, Pin Light, Hard Mix, Subtract, Divide, Darker Color, and Lighter Color affect the composite instead of becoming Normal.

**Post-conditions** — Render, merge, stamp, flatten, export, selection previews, and sampling helpers all use the same blend-mode draw path.

### Feature 3 — Layers Panel Live Preview

**What it does** — Replaces the blend mode select with a Photoshop-style menu button whose items preview on hover and commit on click.

**Photoshop habit preserved** — Hovering over a blend mode updates the document temporarily; leaving the menu or pressing Esc restores the original mode without history.

**Post-conditions** — Clicking a mode creates one undoable `Layer Blend Mode` history entry.

### Feature 4 — Shift+Plus / Shift+Minus Cycle

**What it does** — Adds global keyboard cycling through the 27-mode list for the active non-Background layer.

**Photoshop habit preserved** — Move Tool and selection-tool users can press Shift+Plus to move down the menu or Shift+Minus to move back up.

**Post-conditions** — Cycling wraps, respects Background-layer restrictions, and avoids paint-family tools that own tool blend modes.

## Out Of Scope This Tick

- Shift+Alt/Option letter shortcuts for jumping directly to named blend modes.
- Brush/tool blend-mode menus beyond the existing paint-tool behavior.
- Additional in-app recipe tutorial text.

## Files Edited / Files Created

- `src/core/blendModes.ts`
- `src/core/Layer.ts`
- `src/core/history.ts`
- `src/core/persistence.ts`
- `src/store/types.ts`
- `src/store/layersSlice.ts`
- `src/store/historySlice.ts`
- `src/compositor/Canvas2DCompositor.ts`
- `src/components/Panels/LayersPanel.tsx`
- `src/components/Dialogs/NewLayerDialog.tsx`
- `src/components/Dialogs/LayerStyleDialog.tsx`
- `src/App.tsx`
- `src/components/layout/MenuBar.tsx`
- `src/utils/exportImage.ts`
- `src/utils/selectAndMaskCompositor.ts`
- `src/tools/cloneStamp.ts`
- `src/tools/spotHealing.ts`
- `src/tools/healingBrush.ts`
- `src/tools/colorRange.ts`
- `src/components/Dialogs/ColorRangeDialog.tsx`
- `src/test/blendModes.test.ts`
- `src/test/09-blend-modes.test.tsx`
- `doc/photoshop-essentials-basics/09-blend-modes/gap-report.md`
- `doc/photoshop-essentials-basics/09-blend-modes/plan.md`

## Test Cases

- Photoshop blend mode option list has exactly 27 entries in order.
- Layers panel hover previews a mode without creating history, reverts on mouse leave, and commits on click.
- Shift+Plus and Shift+Minus cycle the active layer from the Move Tool and skip paint-family tools.
- Common recipe modes visibly alter a two-layer composite.
- Background layer blend-mode restrictions remain intact.

## Divergences From Photoshop

- None.

## Stop Conditions

- Stop if existing saved documents cannot normalize legacy `source-over` blend modes.
- Stop if hover preview creates undo history.
- Stop if export, merge, or sampling paths disagree with viewport compositing.
