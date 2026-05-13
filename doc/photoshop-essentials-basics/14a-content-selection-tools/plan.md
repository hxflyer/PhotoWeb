# 14a Content Selection Tools Plan

## Implementation

1. Add `object-selection` to the tool id union, registered tools, W toolbar flyout, W shortcut cycle, status labels, cursor badge set, and shortcut list.
2. Create `src/tools/objectSelection.ts` with Rectangle/Lasso modes, options storage, overlay preview, selection modifier capture, inside-drag movement, and Space reposition for rectangle drags.
3. Use existing selection primitives: `resolveSelectionOp`, `beginSelectionInteraction`, `commitSelectionOperation`, `sampleSourceImageData`, and marquee rectangle rasterization.
4. Add Object Selection Options Bar controls and direct mode switching between Rectangle and Lasso.
5. Add focused unit/UI tests for tool registration, toolbar/shortcut exposure, options updates, rectangle shrink-wrap, lasso shape commit, Shift add, and Alt subtract/manual Object Subtract behavior.

## Verification

- `npx tsc -b`
- `npm run lint`
- `npm test`
