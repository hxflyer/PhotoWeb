# 17 Layer Masks Gap Report

Cluster: `17-layer-masks`
Lessons:
- `understanding-photoshop-layer-masks`
- `layer-masks`
- `photoshop-layer-masks-advanced-tips-and-tricks`
- `how-to-paste-an-image-into-a-layer-mask-in-photoshop`
- `fake-layer-mask`
- `using-layer-effects-with-layer-masks-in-photoshop`
- `blending-photos-with-layer-masks-and-gradients-in-photoshop`

## Lesson Contract

- Add Layer Mask from the Layers panel; Alt/Option-click creates a hide-all mask.
- Painting on an active mask uses grayscale: white reveals, black hides, gray partially reveals.
- Mask thumbnails support Photoshop-style modifiers: Alt/Option-click views the mask as grayscale, Shift-click disables/enables it, and Cmd/Ctrl-click loads it as a selection.
- Pasting while the mask is active pastes image luminance into the layer mask.
- Layer Mask Hides Effects clips layer effects by the layer mask.
- Gradients and normal paint tools can be used on masks for photo blending.
- Adjustment layers can act as practical/fake masks through their built-in mask behavior.

## Existing Coverage

- Layer masks exist on layers and groups.
- Add reveal-all / hide-all masks and add masks from selections exist.
- Brush and Eraser tools already target the active mask and convert brush color to grayscale for masks.
- Mask density, feather, invert, apply, disable, delete, and Properties-panel Mask Edge / Color Range buttons exist.
- Layer-mask persistence and history snapshots exist.
- The compositor already applies masks for normal layer rendering.

## Gaps Found

- The Layers-panel Add Layer Mask button did not honor Alt/Option-click for hide-all.
- Mask thumbnail modifiers were incomplete: Alt/Option toggled enable/disable instead of mask view, Shift-click was not the disable shortcut, and Cmd/Ctrl-click did not load the mask as a selection.
- There was no mask-only grayscale document view.
- Paste always created a new layer; active-mask paste did not write clipboard luminance into the mask.
- The Layer Mask Hides Effects blending option existed in UI/state but did not affect compositor output.

## Implementation Plan

- Add viewed-mask state and render a mask-only grayscale canvas view when Alt/Option-clicking a mask thumbnail.
- Change mask thumbnail modifiers to Alt/Option = view mask, Shift = disable/enable, Cmd/Ctrl = load mask as selection.
- Make Alt/Option-click on the Layers-panel Add Layer Mask button create a hide-all mask.
- Route `pasteTransferredLayer` into the active mask when mask editing is active.
- Apply layer masks after effect rendering when Layer Mask Hides Effects is enabled.
- Add focused tests for each modifier/output behavior.
