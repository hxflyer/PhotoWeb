# 16b Focus Area Gap Report

Cluster: `16b-focus-area`
Lessons:
- `focus-area`
- `improving-focus-area-selections-refine-edge`

## Lesson Contract

- Select > Focus Area opens a dialog that analyzes the active image and proposes a selection from in-focus regions.
- The Focus Area dialog supports view modes such as On White, On Black, Overlay, On Layers, and Black & White; `F` cycles the view.
- In-Focus Range expands/contracts the proposed focus selection.
- Image Noise Level adjusts sensitivity for noisy images.
- Add/Subtract brush tools refine the proposed selection; `E` toggles, Alt/Option temporarily switches, and bracket keys change brush size.
- Preview can be toggled with the checkbox or `P`.
- Soften Edges can anti-alias/soften the initial Focus Area result.
- Output To supports Selection, Layer Mask, New Layer, and New Layer with Layer Mask.
- Refine Edge handoff sends the Focus Area selection into the refinement dialog for edge cleanup.

## Existing Coverage

- Selection masks, output-to-layer-mask, new-layer cutouts, and Refine Edge output behavior already exist elsewhere.
- `SelectAndMaskCanvas` already provides the relevant view-mode compositor.
- The 16a work provides a classic Refine Edge dialog with live preview and output targets.

## Gaps Found

- There was no Select > Focus Area command.
- There was no Focus Area dialog, in-focus analysis, view controls, preview toggle, add/subtract brush refinement, output choices, or Refine Edge handoff.

## Implementation Plan

- Add a local deterministic focus metric based on image edge strength, not cloud/ML analysis.
- Expose Select > Focus Area and store open/close state.
- Add Focus Area dialog controls for view mode, In-Focus Range, Image Noise Level, Soften Edges, Preview, add/subtract brush, brush size, Output To, OK, Cancel, and Refine Edge.
- Reuse `SelectAndMaskCanvas` for view-mode previews.
- Apply the resulting mask to the active selection, active layer mask, new cutout layer, or new layer with mask.
- Add focused tests for focus analysis, range behavior, softening, menu access, brush refinement, output, and Refine Edge handoff.
