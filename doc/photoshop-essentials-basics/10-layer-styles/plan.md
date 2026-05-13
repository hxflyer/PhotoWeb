# 10 Layer Styles Plan

## Goals

### Feature 1 — Photoshop Entry Points

**What it does** — Adds a bottom Layers-panel `fx` button and completes `Layer > Layer Style` with Blending Options plus the ten effect commands.

**Photoshop habit preserved** — Users can open layer styles from the same two places used in Photoshop.

**Post-conditions** — Choosing an effect adds it if needed and opens Layer Style focused on that effect.

### Feature 2 — Background Guardrails

**What it does** — Prevents Background layers from receiving effects through the store, bottom `fx`, context menus, and style presets.

**Photoshop habit preserved** — Layer effects are unavailable while the locked Background layer is selected.

### Feature 3 — New Style And Styles Panel

**What it does** — Adds `New Style...` to the Layer Style dialog, stores reusable layer-style presets, adds Window > Styles, and renders a Styles panel that applies or clears styles on the active layer.

**Photoshop habit preserved** — A user can save a layer's current effects and optionally include blending options, then apply the saved style to another layer.

### Feature 4 — Effect Rendering Semantics

**What it does** — Renders effects in a stable Photoshop-like order and keeps Fill Opacity from attenuating effects on groups.

**Photoshop habit preserved** — The visible style stack does not depend on the order in which effects were added, and Fill controls pixels while Opacity controls pixels plus effects.

## Out Of Scope This Tick

- `.asl` import/export and Preset Manager workflows.
- Rich rendered style thumbnails and default Photoshop style packs/folders.
- Multiple copies of the same effect kind.
- Full OK/Cancel snapshot semantics for every live dialog slider.

## Files Edited / Files Created

- `src/App.tsx`
- `src/components/Dialogs/LayerStyleDialog.tsx`
- `src/components/Panels/LayersPanel.tsx`
- `src/components/Panels/RightPanelDock.tsx`
- `src/components/Panels/StylesPanel.tsx`
- `src/components/layout/MenuBar.tsx`
- `src/compositor/Canvas2DCompositor.ts`
- `src/store/layersSlice.ts`
- `src/store/panelsSlice.ts`
- `src/store/presetsSlice.ts`
- `src/store/types.ts`
- `src/test/01c-panels.test.tsx`
- `src/test/10-layer-styles.test.tsx`
- `src/test/windowMenu.test.ts`
- `doc/photoshop-essentials-basics/10-layer-styles/gap-report.md`
- `doc/photoshop-essentials-basics/10-layer-styles/plan.md`

## Test Cases

- Bottom `fx` opens the effects menu and choosing Drop Shadow opens the Layer Style dialog on the Drop Shadow tab.
- Background layers cannot receive effects via the bottom `fx` button or store action.
- Layer > Layer Style > Drop Shadow opens Layer Style and adds the effect.
- New Style saves effects plus optional blending options; Styles panel applies the saved style to another layer and `None` clears effects.
- Existing layer-style, panel, and Fill-vs-Opacity tests remain green.

## Divergences From Photoshop

- Saved styles are persisted as browser-local presets rather than external `.asl` style sets.
- Styles panel thumbnails are compact text tiles, not rendered style previews.

## Stop Conditions

- Stop if Background layers can receive effects.
- Stop if Fill Opacity attenuates effects.
- Stop if saved styles cannot be applied undoably.
