# 073 photoshop-layer-masks-advanced-tips-and-tricks
- Lesson path: `doc/photoshop-essentials-basics/photoshop-layer-masks-advanced-tips-and-tricks/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 17-layer-masks

## Lesson Expectations
- Add reveal/hide masks; invert masks; Alt/Option-click mask thumbnail to view mask as grayscale in document; Shift-click disables mask with red X.
- Alt/Option-drag mask thumbnail copies mask to another layer; drag to move if not holding Alt/Option.
- Properties/Masks panel controls Density and Feather; Mask Edge / Color Range refine mask.
- Screenshots grounding UI: `cc-layer-mask-tips-tricks-layer-mask-thumbnail-photoshop-16ba23f3.png`, `cc-layer-mask-tips-tricks-view-layer-mask-document-29e728ff.jpg`, `cc-layer-mask-tips-tricks-layer-mask-disabled-photoshop-ae60cf4f.png`, `cc-layer-mask-tips-tricks-mask-properties-panel-density-feather-2dfe3d52.png`.

## Photoweb Coverage
- Layer Mask menu exposes Reveal All/Hide All/Reveal Selection/Hide Selection/Disable/Apply/Delete in `src/components/layout/MenuBar.tsx:461`.
- Layers panel mask thumbnail draws red slash when disabled in `src/components/Panels/LayersPanel.tsx:120`.
- Properties panel exposes Mask Enabled/Linked, Density, Feather, Mask Edge, Color Range, Invert, Apply, Disable, Delete in `src/components/Panels/PropertiesPanel.tsx:280`.
- Store applies mask Density and Feather as undoable layer-property commands in `src/store/layersSlice.ts:1405`.
- Tests cover mask behavior in `src/test/17-layer-masks.test.tsx`, `src/test/maskPropertiesButtons.test.tsx`, and `src/test/maskPaint.test.ts`.

## Gaps / Mismatches
- Need verify Alt/Option-click thumbnail toggles grayscale mask view; `viewedLayerMaskId` exists, but exact modifier UI behavior was not fully inspected.
- Alt/Option-drag mask thumbnail copy/move behavior was not confirmed.
- Density/Feather are present but need visual parity testing for live composite output.

## Scope Decision
Fix

## Recommended Follow-up
Audit/test modifier thumbnail gestures: Alt/Option-click view, Shift-click disable, Alt/Option-drag copy mask.

