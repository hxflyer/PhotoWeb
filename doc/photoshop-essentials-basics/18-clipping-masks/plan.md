# 18 Clipping Masks Plan

## Goal

Make clipping masks behave like the Photoshop lessons describe: the selected upper layer can be clipped to the layer directly below, including the common photo-inside-text workflow.

## Implementation

1. Add a persistent `clippedToBelow` flag to layers.
2. Add store actions for create, release, and toggle clipping mask.
3. Render clipping stacks in the compositor by drawing the base layer normally and constraining consecutive clipped siblings to the base alpha.
4. Wire Photoshop invocations:
   - `Layer > Create Clipping Mask`
   - `Layer > Release Clipping Mask`
   - `Cmd/Ctrl+Alt/Option+G`
   - Alt/Option-click on the Layers panel row
   - Layers panel context/flyout entries
5. Show the Layers panel clipping indicator on clipped rows.
6. Preserve the flag through undo/redo, save/load, document switching, transfer, and duplication.

## Acceptance

- A full-canvas photo layer clipped to a rectangular/type base only renders over the base's non-transparent pixels.
- Releasing the clipping mask restores normal full-layer visibility.
- Type layers remain type layers while serving as the clipping base.
- Layer menu, keyboard shortcut, and Layers panel Alt-click all toggle the same layer state.
- Clipped rows expose a visible arrow indicator.

## Tests

- `src/test/18-clipping-masks.test.tsx`
- Adjacent coverage: Layers panel, layer style menu, advanced blending/compositor tests.

## Divergences

- None. Older Photoshop versions used `Cmd/Ctrl+G` for clipping masks, but the cluster and current Photoshop-style contract use `Cmd/Ctrl+Alt/Option+G`, leaving `Cmd/Ctrl+G` for grouping.
