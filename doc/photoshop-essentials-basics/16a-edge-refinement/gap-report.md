# 16a Edge Refinement Gap Report

Cluster: `16a-edge-refinement`
Lessons:
- `feather-quick-mask`
- `access-refine-edge-photoshop-cc-2018`

## Lesson Contract

- `Q` or the Tools-panel Quick Mask button toggles Quick Mask mode.
- Quick Mask displays the active selection as a translucent red protected-area overlay: visible pixels are selected, red pixels are not selected.
- While in Quick Mask mode, the Gaussian Blur filter should act on the Quick Mask mask, with preview updates visible on the document overlay before OK.
- Exiting Quick Mask converts the softened mask back into a soft selection.
- Select > Modify > Feather remains a non-preview numeric command.
- Shift-selecting Select > Select and Mask is the classic path to the Refine Edge dialog; Refine Edge requires an initial selection.

## Existing Coverage

- Quick Mask mode, toolbar toggle, and `Q` shortcut already exist.
- The overlay already draws red over areas outside the current selection.
- A Feather Selection dialog already exists under Select > Modify > Feather.
- A Select and Mask / Refine Edge dialog already exists with Radius, Smooth, Feather, Contrast, Shift Edge, Smart Radius, view modes, output targets, and live selection preview.

## Gaps Found

- Quick Mask paint buffer semantics were mixed: the overlay rendered painted buffer pixels as red protected pixels, but the exit conversion treated the same alpha as selected coverage.
- The Viewport only read Quick Mask buffer edits made locally by brush dabs; store-level buffer changes, such as future filter updates, did not refresh the overlay.
- Filter > Blur > Gaussian Blur always previewed and committed against the active layer pixels. In Quick Mask mode it should preview and commit against the Quick Mask selection mask instead.
- The filter preview was confined to the filter dialog canvas. The lesson specifically calls out watching the document Quick Mask overlay soften while dragging the Radius slider.
- Quick Mask brushing did not use foreground black/white semantics; it always added coverage except for the Eraser tool.

## Implementation Plan

- Treat `quickMaskBuffer` as selected coverage alpha, not red overlay alpha.
- Render Quick Mask as red protected overlay by subtracting the selected-coverage mask from a red fill.
- Sync store `quickMaskBuffer` changes into the Viewport overlay canvas.
- Build a Quick Mask filter source from the current buffer or current selection mask when Gaussian Blur opens in Quick Mask mode.
- Add a filter-dialog preview callback so radius changes can update the document overlay without committing layer pixels.
- On OK, keep the blurred Quick Mask buffer and update Last Filter. On cancel, restore the pre-dialog Quick Mask buffer.
- Update brushing so white/light foreground paint adds selected coverage and black/dark foreground paint removes selected coverage.
- Add tests for Quick Mask conversion, Gaussian Blur-on-mask commit, cancel restore, and Refine Edge access.
