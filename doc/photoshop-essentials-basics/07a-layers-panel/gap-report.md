# 07a Layers Panel Gap Report

## Lessons Reviewed

- `understanding-photoshop-layers` — why layers are independent, visible rows in the Layers panel, add/delete, reorder, multi-select.
- `layers-intro` — older Layers palette basics: preview thumbnail, visibility, stacking order, and New Layer button.
- `layers-panel` — modern Layers panel anatomy: Window > Layers / F7, row thumbnails, active row, visibility eye, opacity, blend mode, locks, masks, groups, Panel Options.
- `photoshop-cs5-layers-panel-essentials` — CS5-era panel coverage with the same row/thumbnail/rename/opacity/blend/lock affordances.
- `essential-layers-panel-preferences` — Panel Options thumbnail size / no thumbnail, plus default mask and copy-name preferences.
- `layer-shortcuts` — F7, Shift+Ctrl/Cmd+N, Shift+Ctrl/Cmd+Alt/Option+N, Ctrl/Cmd+J, Ctrl/Cmd+[ / ], Shift+Ctrl/Cmd+[ / ], visibility eye shortcuts.
- `photoshop-layers-essential-shortcuts` — older shortcut coverage overlapping `layer-shortcuts`.
- `photoshop-layers-learning-guide` — index page that routes the Layers tutorial sequence.

## Current Photoweb Coverage

- Layers panel already lives in the right dock with rows, thumbnail canvas, visibility eye, active-row highlight, group disclosure, color tags, locks, opacity/fill, blend mode, masks, drag reorder, and bottom Add/Delete buttons in [LayersPanel.tsx](../../../src/components/Panels/LayersPanel.tsx).
- F7 toggles the Layers panel from [App.tsx](../../../src/App.tsx).
- `Cmd/Ctrl+J`, merge, group, ungroup, and delete shortcuts already exist in [App.tsx](../../../src/App.tsx).
- Layer creation, duplication, groups, reorder, visibility, locks, names, opacity/fill, blend mode, masks, and effects are backed by [layersSlice.ts](../../../src/store/layersSlice.ts).
- Layer menu entries exist under `Layer` in [MenuBar.tsx](../../../src/components/layout/MenuBar.tsx).

## Gaps

- `Layer > New > Layer...` and `Shift+Cmd/Ctrl+N` created a generic layer immediately instead of opening Photoshop's New Layer dialog (lesson screenshot `layers-layers-keyboard-shortcuts-photoshop-new-layer-dialog-box-f5d719a2.png`).
- `Shift+Cmd/Ctrl+Alt/Option+N` did not provide the Photoshop bypass path for creating a generic layer without the dialog.
- `Cmd/Ctrl+[`, `Cmd/Ctrl+]`, `Shift+Cmd/Ctrl+[`, and `Shift+Cmd/Ctrl+]` did not move the active layer through the stack (lesson screenshots `layers-layers-keyboard-shortcuts-photoshop-jump-layer-top-b930b342.png`, `layers-layers-keyboard-shortcuts-photoshop-jump-layer-bottom-176cf6d6.png`).
- The active layer visibility shortcut `;` was missing even though the panel eye behavior was present.
- The Layers panel had fixed preview thumbnails and no Panel Options / No Thumbnails path (lesson screenshots `layers-layers-panel-photoshop-layers-panel-options-351aa256.png`, `layers-layers-panel-preferences-thumbnail-size-options-09a29027.gif`).
- Alt/Option-clicking the New Layer button did not open the New Layer dialog.

## Photoshop-Habit Mismatches

- Photoshop users expect `Shift+Cmd/Ctrl+N` to pause for a layer name and settings, not silently create "Layer N".
- Photoshop users expect `Shift+Cmd/Ctrl+Alt/Option+N` to be the no-dialog fast path.
- Photoshop users expect bracket shortcuts to map to layer stack movement, while unmodified brackets remain brush size/hardness.
- Photoshop users expect the Layers panel menu to include `Panel Options...` for thumbnail size.

## UI / UX Issues

- The fixed 36px thumbnail was usable but not tunable for dense documents.
- The New Layer button had no modifier-aware path for naming before creation.

## Photoshop Divergences Worth Keeping

- Layer Style is still reachable from the existing thumbnail double-click and context menu path; the lessons explicitly ground rename on double-clicking the layer name, which photoweb already supports.
- Default-mask and copied-layer-name preferences from `essential-layers-panel-preferences` remain outside this tick because the 07a cluster is scoped to panel rows, thumbnails, visibility, locking, opacity/blend, add/delete/duplicate, and shortcuts.
