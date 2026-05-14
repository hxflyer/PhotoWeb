# 234 fake-layer-mask
- Lesson path: `doc/photoshop-essentials-basics/fake-layer-mask/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `17-layer-masks`

## Lesson Expectations
- Photoshop Elements workaround: place an adjustment layer between photos, group the photo with the adjustment layer, select the adjustment layer’s mask, and paint/gradient on it to fake a layer mask.
- Uses Move Tool drag between documents, adjustment layer mask thumbnail, clipping/grouping, Gradient Tool black-to-white.
- UI screenshots: `elements-fake-layer-mask-layers-palette-d7a79a41.gif`, `elements-fake-layer-mask-group-with-previous-435c74bf.gif`, `elements-fake-layer-mask-draw-gradient-c4841a3e.gif`.

## Photoweb Coverage
- Native layer masks are implemented, so the Elements fake-mask workaround is unnecessary (`src/store/layersSlice.ts:1139-1328`).
- Add Layer Mask button supports reveal/hide behavior (`src/components/Panels/LayersPanel.tsx:1043-1044`).
- Clipping masks exist for photo-in-text and grouped layer behavior (`src/test/18-clipping-masks.test.tsx:73-117`).
- Gradient and mask painting workflows are covered by mask tests (`src/test/17-layer-masks.test.tsx`, `src/test/maskPaint.test.ts`).

## Gaps / Mismatches
- The exact Elements workaround is not reproduced, but photoweb has the stronger Photoshop-native feature.
- Multi-document dragging is largely out of scope/limited, so the opening setup differs.

## Scope Decision
divergence already accepted.

## Recommended Follow-up
No action; prefer native masks.
