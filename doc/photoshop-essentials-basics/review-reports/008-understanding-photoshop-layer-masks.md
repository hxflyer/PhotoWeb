# 008 understanding-photoshop-layer-masks
- Lesson path: `doc/photoshop-essentials-basics/understanding-photoshop-layer-masks/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 17-layer-masks

## Lesson Expectations
- Add a layer mask, paint black/white/gray to hide/reveal partially, view mask directly, disable/enable mask, non-destructive masking versus Eraser.
- Screenshots include `layers-layer-masks-photoshop-load-files-into-stack-aeaf8dba.png`, `layers-layer-masks-photoshop-images-loaded-layers-1115f8f3.png`, and mask thumbnail examples.

## Photoweb Coverage
- Layers panel has Add Layer Mask button and mask context actions (`src/components/Panels/LayersPanel.tsx:1043`, `src/components/Panels/LayersPanel.tsx:1131`, `src/components/Panels/LayersPanel.tsx:1134`).
- Store supports add, delete, enable, link, invert, and apply mask history commands (`src/store/layersSlice.ts:1243`, `src/store/layersSlice.ts:1264`, `src/store/layersSlice.ts:1278`, `src/store/layersSlice.ts:1292`, `src/store/layersSlice.ts:1305`, `src/store/layersSlice.ts:1328`).
- Brush painting can target masks and records mask brush strokes (`src/tools/brush.ts:186`, `src/test/maskPaint.test.ts:59`).
- Tests cover Alt-click hide-all mask and mask thumbnail modifiers (`src/test/17-layer-masks.test.tsx:48`, `src/test/17-layer-masks.test.tsx:58`).

## Gaps / Mismatches
- None found for the lesson's core beginner mask behaviors.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
