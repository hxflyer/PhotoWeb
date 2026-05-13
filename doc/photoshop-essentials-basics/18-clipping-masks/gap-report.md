# 18 Clipping Masks Gap Report

Cluster: `18-clipping-masks`

Lessons:
- `clipping-masks-essentials`
- `clipping-masks-and-type`

## Photoshop Contract

- A clipping mask is created from the upper layer and the layer directly below it.
- `Layer > Create Clipping Mask` and `Ctrl/Cmd+Alt/Option+G` toggle the clipped relationship.
- Alt/Option-clicking between two rows in the Layers panel creates or releases the clipping mask.
- The upper layer remains editable, but its rendered pixels are visible only where the lower layer has non-transparent content.
- Type layers can be the clipping base, so a photo layer above appears inside editable letterforms.
- The Layers panel shows the clipped layer indented with an arrow pointing toward the base layer.

## Existing Photoweb State

- Layer rows, layer ordering, type layers, groups, masks, effects, history, and document persistence already existed.
- No layer model field represented "clipped to layer below".
- The compositor rendered each sibling layer independently, so an upper layer could not be constrained by the alpha of the lower layer.
- `Cmd/Ctrl+G` and `Cmd/Ctrl+Shift+G` were already assigned to Group/Ungroup, matching modern Photoshop; `Cmd/Ctrl+Alt/Option+G` was free.
- The Layer menu and Layers panel context menu had no clipping-mask entry.

## Implemented Work

- Added `clippedToBelow` to the layer model, history snapshots, save/load manifests, document cloning, and duplication.
- Added create, release, and toggle clipping-mask layer actions.
- Added `Layer > Create/Release Clipping Mask`, `Cmd/Ctrl+Alt/Option+G`, row Alt/Option-click, panel flyout, and row context-menu entry points.
- Updated the compositor to render sibling clipping stacks and mask clipped layers by the base layer's alpha.
- Added the Layers panel clipped-row indicator and `data-layer-clipped` state for tests.

## Verification

- New focused tests cover clipped rendering, type-layer base preservation, menu/shortcut toggling, and Layers panel Alt-click indicator behavior.

## Divergences

- None for this cluster. The modern Photoshop shortcut and menu vocabulary are preserved.
