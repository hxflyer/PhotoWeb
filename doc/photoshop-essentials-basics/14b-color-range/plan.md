# 14b Color Range Plan

## Implementation

1. Update sampled Color Range mask generation so add samples produce alpha falloff according to Fuzziness, while subtract samples remove matching regions.
2. Extend `ColorRangeDialog` with dialog-preview mode and selection-preview mode controls.
3. Render preview modes from the same image and mask: grayscale mask, raw image, selected image on black/white, and Quick Mask overlay.
4. Initialize Color Range state from `selectionDialogPrefs.colorRange` and persist updated settings on OK.
5. Add focused tests for partial alpha, preview mode rendering, and preference persistence.

## Verification

- `npx tsc -b`
- `npm run lint`
- targeted Color Range tests
- `npm test`
