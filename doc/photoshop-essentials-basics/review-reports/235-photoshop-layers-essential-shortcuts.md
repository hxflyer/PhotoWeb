# 235 photoshop-layers-essential-shortcuts
- Lesson path: `doc/photoshop-essentials-basics/photoshop-layers-essential-shortcuts/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `07a-layers-panel`

## Lesson Expectations
- Layers shortcuts: open/close Layers panel (`F7`), new layer, new layer below, copy layer/selection to new layer, select all/similar layers, multi-select layers, select top/bottom, scroll through layers, move layers up/down.
- UI screenshots: `layer-shortcuts-photoshop-layers-palette-555c3b0e.gif`, `layer-shortcuts-photoshop-new-layer-icon-2f971cf5.gif`, `layer-shortcuts-select-multiple-layers-529fbcc4.gif`.

## Photoweb Coverage
- Layers panel supports rows, multi-selection anchor/ranges, panel menu/new layer, and layer controls (`src/components/Panels/LayersPanel.tsx:421-609`, `src/components/Panels/LayersPanel.tsx:781-1059`).
- Window menu toggles Layers with `F7` (`src/components/layout/MenuBar.tsx:685`).
- Shortcut registry includes common layer shortcuts such as clipping and duplicate/deselect (`src/core/shortcuts.ts:53-63`); tests cover shortcut dialog entries (`src/test/batchDDocumentDialogs.test.tsx:472`).
- Tests cover layers panel behaviors (`src/test/07a-layers-panel.test.tsx`, `src/test/layersPanelDragGroup.test.tsx`, `src/test/layers.test.ts`).

## Gaps / Mismatches
- Need a dedicated audit against every legacy shortcut in the lesson; several older Photoshop shortcuts for top/bottom/scroll-through layer selection may not exist.
- `Select Similar Layers` appears unlikely to be implemented.

## Scope Decision
Fix.

## Recommended Follow-up
Create a layer-shortcut matrix test/doc and mark legacy or low-value shortcuts as accepted divergences where appropriate.
