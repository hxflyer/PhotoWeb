# 06-crop gap report

## Lessons reviewed

- `cropping-images-in-photoshop-complete-lesson-guide` - overview of Crop Tool basics, straightening, canvas expansion, tips, Perspective Crop, exact frame crops, Content-Aware Crop, and circular crops.
- `how-to-crop-images-photoshop-cc` - Crop Tool workflow, non-destructive Delete Cropped Pixels toggle, overlay, commit/cancel, and straighten.
- `photoshop-crop-tool-tips-and-tricks` - `C`, Shift ratio lock, Alt/Option resize from center, `X` swap orientation, `H` hide cropped area, `P` Classic Mode, `O` overlays, Enter/Esc.
- `how-to-keep-images-centered-after-cropping` - Image > Crop from selections and Crop Tool Classic Mode centering behavior.
- `how-to-crop-a-single-layer-in-photoshop` - layer-local cropping via selection/deleting outside or masking instead of document-wide Crop Tool.
- `crop-image-circle-photoshop` - Elliptical Marquee circular crop with mask/transparent trim and PNG output.
- `perspective-crop-tool-photoshop` - Perspective Crop Tool behind Crop, grid/handles, Enter commit, perspective correction.

## Current photoweb coverage

- Crop Tool already supports `C`, corner/edge handles, Shift and Alt/Option modifiers, overlay cycling with `O`, Enter commit, Esc cancel, Delete Cropped Pixels, expansion beyond canvas, and Straighten from 05b/05c.
- `Image > Trim` exists and can trim transparent pixels after a mask-like workflow.
- Selection tools can create rectangular and elliptical selections; layer masks from selections already exist in the layer slice.

## Gaps addressed

- `X` did not swap crop orientation.
- `H` did not hide the cropped area.
- Classic Mode had no visible/toggleable Crop Options Bar state.
- Crop flyout had no Perspective Crop Tool, and `Shift+C` could not cycle to it.
- `Image > Crop` was disabled, so marquee-selection crop workflows were missing.
- Simulator coverage did not assert the Crop Tool shortcut cluster.

## Remaining Photoshop divergences

- Perspective Crop Tool does not perform true projective perspective unwarp; it provides the Photoshop entry point and crop-grid/commit behavior.
- Classic Mode is surfaced and persisted in the Crop Options Bar, but photoweb does not yet implement Photoshop's alternate "move image under fixed crop border" interaction model.
- Circular crop remains a layer-mask/Trim workflow using existing mask and transparent trim capabilities rather than a one-click circular document crop, because Photoshop documents remain rectangular.
