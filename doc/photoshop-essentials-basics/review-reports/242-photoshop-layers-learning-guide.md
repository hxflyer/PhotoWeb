# 242 photoshop-layers-learning-guide
- Lesson path: `doc/photoshop-essentials-basics/photoshop-layers-learning-guide/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `07a-layers-panel`

## Lesson Expectations
- This is a learning-guide index for Photoshop layers, not a single workflow lesson; it points to core concepts like layers intro, Layers panel, Background layer, layer masks, clipping masks, layer styles, opacity/fill, groups, copy/align/move layers.
- No screenshots in the lesson file.

## Photoweb Coverage
- Layers are a core app subsystem: layer model (`src/core/Layer.ts`), layers slice (`src/store/layersSlice.ts`), Layers panel (`src/components/Panels/LayersPanel.tsx`), compositor/effects, masks, clipping masks, groups, opacity/fill, and history.
- Completed clusters in `work-queue.md` cover Layers panel, Background layer, layer ops, Properties panel, layer styles, masks, clipping masks, and related tests.
- Tests cover broad layer behavior (`src/test/07a-layers-panel.test.tsx`, `src/test/layers.test.ts`, `src/test/08a-layer-ops.test.tsx`, `src/test/17-layer-masks.test.tsx`, `src/test/18-clipping-masks.test.tsx`).

## Gaps / Mismatches
- Because this is an index, gaps belong to the linked individual lessons rather than this page.
- Recurring layer gaps in this slice: full legacy layer-shortcut parity, exact mask-thumbnail modifier matrix, and style/swatch/custom-shape set exchange.

## Scope Decision
divergence already accepted.

## Recommended Follow-up
No action beyond the specific linked lesson reports.
