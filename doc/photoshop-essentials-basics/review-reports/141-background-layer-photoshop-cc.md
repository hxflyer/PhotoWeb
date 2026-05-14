# 141 background-layer-photoshop-cc
- Lesson path: `doc/photoshop-essentials-basics/background-layer-photoshop-cc/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `07b-background-layer`

## Lesson Expectations
- Background layer is locked, italicized, bottom-only, opaque, and restricted from transparency, moving, reordering, opacity, blend mode, and some edits.
- Clicking the lock or choosing Layer > New > Layer from Background converts it to Layer 0.
- A normal layer can be converted back with Layer > New > Background from Layer.
- Lesson images ground the lock icon, italic Background name, and Layer 0 conversion surfaces.

## Photoweb Coverage
- `src/components/Panels/LayersPanel.tsx:962` renders names and background styling; `src/components/Panels/LayersPanel.tsx:997` handles the background lock conversion affordance.
- `src/store/layersSlice.ts:451`, `src/store/layersSlice.ts:536`, `src/store/layersSlice.ts:699`, and `src/store/layersSlice.ts:715` guard background deletion, moving/resizing content, opacity, and blend mode.
- `src/test/07b-background-layer.test.tsx:38` covers background creation/conversion, `src/test/07b-background-layer.test.tsx:70` covers restrictions, and `src/test/07b-background-layer.test.tsx:101` covers Background from Layer.

## Gaps / Mismatches
- None found for the core Photoweb target.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
