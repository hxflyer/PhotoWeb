# 07b Background Layer Gap Report

## Lessons Reviewed

- `background-layer` — CS6 Background layer rules: locked position, no transparency, bottom-only stacking, disabled blend/opacity/fill, convert via Layer > New > Layer from Background or Alt/Option double-click.
- `photoshop-background-layer` — CS5 version emphasizing italic Background name, lock icon, and New Layer dialog defaulting to Layer 0.
- `background-layer-photoshop-cc` — CC behavior: click the lock icon to instantly convert Background to `Layer 0`; `Layer > New > Background from Layer` converts a normal layer back.

## Current Photoweb Coverage

- New documents already create a layer named `Background` in [documentSlice.ts](../../../src/store/documentSlice.ts), but it was only a normal raster layer with a name.
- The Layers panel already shows lock icons and lock controls in [LayersPanel.tsx](../../../src/components/Panels/LayersPanel.tsx).
- Move Tool and selected-pixel movement already honor lock flags in [move.ts](../../../src/tools/move.ts).
- Layer reorder, opacity, fill, blend mode, rename, and delete actions live in [layersSlice.ts](../../../src/store/layersSlice.ts).

## Gaps

- No real Background-layer state existed, so "Background" could be moved, reordered, made transparent, deleted, and blended like any other layer.
- New image documents did not open the image on a locked Photoshop-style Background layer.
- Transparent new documents should not become locked Background layers.
- Blend Mode, Opacity, and Fill controls were still editable for the Background layer (`layers-background-layer-background-layer-blend-mode-opacity-058f6f62.png`).
- The lock icon did not convert Background to `Layer 0` (`layers-background-layer-photoshop-unlock-background-layer-653c4894.png`).
- `Layer > New > Layer from Background` and `Layer > New > Background from Layer` were missing or disabled.
- Reorder allowed the Background layer to leave the bottom of the stack, and allowed other layers to move below it.

## Photoshop-Habit Mismatches

- Photoshop users expect the Background layer name to be italic and have a lock icon (`layers-background-layer-photoshop-layers-panel-27279322.png`).
- Photoshop users expect Move Tool drag / layer-stack drag to be blocked by the Background lock (`layers-background-layer-photoshop-warning-e6477abc.png`, `layers-background-layer-photoshop-moving-background-layer-007dd9f5.png`).
- Photoshop users expect deleting/erasing pixels on Background not to create transparency (`layers-background-layer-photoshop-fill-command-ba77b7b0.png`).
- Photoshop users expect converting Background to unlock it and rename it `Layer 0`.

## UI / UX Issues

- The lock indicator was passive for Background; in Photoshop CC it is the fastest conversion control.
- Background-specific restrictions were invisible in the toolbar controls because the fields remained enabled.

## Photoshop Divergences Worth Keeping

- Photoweb converts Background to `Layer 0` immediately from the lock icon and menu path. Older Photoshop versions opened a New Layer dialog; CC uses the one-click conversion path and better matches the current muscle-memory target.
