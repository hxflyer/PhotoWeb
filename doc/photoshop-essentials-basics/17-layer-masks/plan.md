# 17 Layer Masks Plan

## Scope

Complete the Photoshop-style layer mask affordances on top of the existing mask model.

## Steps

1. Preserve existing mask creation, paint, density, feather, and Properties-panel behavior.
2. Add missing Layers-panel modifier semantics for mask creation and mask thumbnails.
3. Add a mask-only grayscale canvas view.
4. Add paste-into-active-mask behavior.
5. Make Layer Mask Hides Effects affect compositor output.
6. Add focused tests and run typecheck, lint, targeted tests, and the full suite.

## Acceptance Checks

- Alt/Option-clicking Add Layer Mask creates a black hide-all mask.
- Clicking a mask thumbnail targets mask painting; Shift-click disables it; Alt/Option-click views it as grayscale; Cmd/Ctrl-click loads it as selection.
- Cmd/Ctrl+V while editing a mask pastes clipboard luminance into the mask instead of creating a new layer.
- Layer Mask Hides Effects clips effects outside the mask.
