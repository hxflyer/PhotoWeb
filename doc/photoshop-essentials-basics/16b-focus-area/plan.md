# 16b Focus Area Plan

## Scope

Implement Focus Area as a local algorithmic selection feature that matches the lesson workflow without relying on Photoshop cloud/ML services.

## Steps

1. Add a deterministic focus-mask utility using local contrast/edge strength.
2. Add Focus Area dialog state and Select-menu access.
3. Build the dialog with view modes, range/noise sliders, preview, soften edges, add/subtract brush, output choices, and Refine Edge handoff.
4. Reuse existing selection, mask, layer, and Refine Edge infrastructure for outputs.
5. Add focused tests and run typecheck, lint, targeted tests, and the full suite.

## Acceptance Checks

- Select > Focus Area opens the dialog.
- In-Focus Range changes the mask size.
- Preview and view mode controls update the preview surface.
- Add/Subtract brushing changes the proposed mask.
- OK can output a selection, layer mask, new layer, or new layer with mask.
- Refine Edge closes Focus Area and opens the Refine Edge dialog using the current Focus Area mask.
