# 191 opacity-vs-fill
- Lesson path: `doc/photoshop-essentials-basics/opacity-vs-fill/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `10-layer-styles`

## Lesson Expectations
- Opacity fades layer content and effects together; Fill fades only layer content while layer styles remain full strength (`layers-opacity-vs-fill-opacity-50-b51f2844.gif`, `layers-opacity-vs-fill-fill-50-a9b261a9.gif`).
- Both controls sit in the top-right of the Layers panel, Fill below Opacity.

## Photoweb Coverage
- Layers panel exposes Opacity and Fill controls in `src/components/Panels/LayersPanel.tsx:646` and `src/components/Panels/LayersPanel.tsx:703`.
- Store has separate `setLayerOpacity` and `setLayerFill` actions in `src/store/layersSlice.ts`.
- Tests copy opacity/fill and guard Background behavior in `src/test/10-layer-styles.test.tsx:85`; layer-style cluster covers Fill semantics.

## Gaps / Mismatches
- Need a direct pixel/compositor regression proving effects remain full-strength when Fill changes but fade with Opacity, if not already in effects tests.

## Scope Decision
Fix.

## Recommended Follow-up
Add/confirm a compositor test with text or pixels plus Drop Shadow/Stroke comparing Opacity 50% vs Fill 50%.
