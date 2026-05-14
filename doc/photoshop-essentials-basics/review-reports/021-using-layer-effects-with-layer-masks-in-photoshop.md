# 021 using-layer-effects-with-layer-masks-in-photoshop
- Lesson path: `doc/photoshop-essentials-basics/using-layer-effects-with-layer-masks-in-photoshop/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 17-layer-masks

## Lesson Expectations
- Layer effects initially remain visible outside a layer mask; Layer Style > Blending Options > Layer Mask Hides Effects makes the mask hide the effect too.
- Lesson also demonstrates placing masked layers into a group and applying Drop Shadow to the group.
- Screenshots include `2023-layer-effects-with-layer-masks-stroke-layer-effect-c9ba4796.png`, `2023-layer-effects-with-layer-masks-using-layer-effects-and-layer-masks-ba7c32a4.jpg`, and `2023-layer-effects-with-layer-masks-layer-mask-hides-effects`.

## Photoweb Coverage
- Layer Style dialog exposes `Layer Mask Hides Effects` (`src/components/Dialogs/LayerStyleDialog.tsx:235`).
- Test verifies outside strokes are clipped when Layer Mask Hides Effects is enabled (`src/test/17-layer-masks.test.tsx:105`).
- Layer effects and mask actions are available through Layers panel and store (`src/components/Panels/LayersPanel.tsx:21`, `src/store/layersSlice.ts:1243`).

## Gaps / Mismatches
- Group-level layer effects used as the lesson's final workaround are not clearly covered by tests; current coverage proves the per-layer mask/effect option, not Drop Shadow applied to a group.

## Scope Decision
Fix

## Recommended Follow-up
Add/verify group layer-style support for masked child layers, or document a deliberate divergence if group effects are not intended.
