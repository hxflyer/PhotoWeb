# 16a Edge Refinement Plan

## Scope

Bring the existing Quick Mask, Feather, and Refine Edge implementation in line with the two lesson flows without changing unrelated filter or selection behavior.

## Steps

1. Document current gaps and preserve existing Select > Modify > Feather behavior as the non-preview command.
2. Normalize Quick Mask buffer meaning to selected alpha coverage.
3. Make the Quick Mask overlay consume selection coverage and display red protected areas.
4. Route Gaussian Blur to the Quick Mask buffer while Quick Mask mode is active, including live document preview during slider changes.
5. Keep layer-pixel Gaussian Blur unchanged outside Quick Mask mode.
6. Add focused tests for mask blur, cancel restore, exit conversion, and Select and Mask / Refine Edge dialog access.
7. Run TypeScript, lint, targeted tests, and the full suite before committing.

## Acceptance Checks

- In Quick Mask mode, a selected rectangle appears clear while unselected pixels are red.
- Filter > Blur > Gaussian Blur softens the Quick Mask edge in preview and the soft mask becomes the selection after `Q`.
- Canceling the Gaussian Blur dialog restores the previous Quick Mask mask.
- Normal layer Gaussian Blur still applies to layer pixels outside Quick Mask mode.
- Select > Select and Mask opens the existing Refine Edge/Select and Mask dialog from the menu.
