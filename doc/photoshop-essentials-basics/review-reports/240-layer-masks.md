# 240 layer-masks
- Lesson path: `doc/photoshop-essentials-basics/layer-masks/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `17-layer-masks`

## Lesson Expectations
- Layer masks reveal/hide layer pixels non-destructively; white reveals, black hides, gray partially reveals.
- Layers panel shows image thumbnail, mask thumbnail, link icon; selecting mask lets Brush/Gradient edit mask.
- Add Layer Mask, Disable/Enable, Apply/Delete, view mask, invert, and mask with selections are expected.
- UI screenshots: `layers-layer-masks-layer-mask-added-d2c0a8ba.gif`, `layers-layer-masks-black-to-white-gradient-91d78756.gif`, `layers-layer-masks-layer-mask-thumbnail-5e028f0a.gif`.

## Photoweb Coverage
- Layer masks, reveal/hide/all/from-selection, invert, apply, enable, link, and edit target are implemented (`src/store/layersSlice.ts:1139-1328`).
- Layers panel shows mask thumbnails, link toggle, Alt/Shift/Cmd-click style behavior, and Add Layer Mask button (`src/components/Panels/LayersPanel.tsx:842-900`, `src/components/Panels/LayersPanel.tsx:1043-1044`).
- Layer menu exposes Layer Mask commands (`src/components/layout/MenuBar.tsx:461-465`).
- Properties panel exposes mask Density/Feather and mask actions (`src/components/Panels/PropertiesPanel.tsx:287-357`).
- Tests cover mask creation, painting, paste-into, and effect hiding (`src/test/17-layer-masks.test.tsx`, `src/test/maskPaint.test.ts`, `src/test/maskPropertiesButtons.test.tsx`).

## Gaps / Mismatches
- Need to verify every Photoshop thumbnail modifier exactly: Alt-click view mask, Shift-click disable, Ctrl/Cmd-click load selection, link icon behavior.
- Vector masks are not in scope for this lesson unless tied to shape/path workflows.

## Scope Decision
Fix.

## Recommended Follow-up
Add a modifier-click matrix test for mask thumbnails and document any browser/right-click differences.
