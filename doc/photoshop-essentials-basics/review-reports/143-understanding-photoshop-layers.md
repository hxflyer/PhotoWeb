# 143 understanding-photoshop-layers
- Lesson path: `doc/photoshop-essentials-basics/understanding-photoshop-layers/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `07a-layers-panel`

## Lesson Expectations
- Explains layers as transparent sheets stacked above a background or canvas.
- Demonstrates thumbnails, visibility toggles, active layer selection, adding layers, moving stacking order, opacity, and blend mode concepts.
- Edge cases are conceptual: transparent pixels reveal layers below; stacking order changes the composite.

## Photoweb Coverage
- `src/components/Panels/LayersPanel.tsx:728` renders row selection, visibility, thumbnails, and layer state.
- `src/components/Panels/LayersPanel.tsx:360` provides blend mode selection; `src/components/Panels/LayersPanel.tsx:640` includes opacity controls.
- `src/store/layersSlice.ts:683` handles visibility and `src/store/layersSlice.ts:699` handles opacity.
- `src/test/07a-layers-panel.test.tsx:33` covers the core panel behaviors that support this conceptual lesson.

## Gaps / Mismatches
- None found for the app target; this lesson is conceptual and the core model is present.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
