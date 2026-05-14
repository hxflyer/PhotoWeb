# 090 watermark-images-photoshop
- Lesson path: `doc/photoshop-essentials-basics/watermark-images-photoshop/lesson.md`
- Scope status: `out_of_scope: watermark_workflow`
- Cluster coverage: `none`

## Lesson Expectations
- Create a transparent logo document, save as PSD, File > Place Linked, transform/reposition, lower opacity, and update all watermarks by editing linked smart-object contents (`smart-objects-watermarks-place-linked-photoshop-f8d4ad52.png`, `smart-objects-watermarks-linked-smart-object-photoshop-6a159ffd.png`).
- Relies on linked Smart Objects and multi-document updates.

## Photoweb Coverage
- Place Embedded exists, and opacity/blend operations are available (`src/components/layout/MenuBar.tsx:177`, `src/components/Panels/LayersPanel.tsx:649`).
- Free Transform and layer opacity can approximate a one-off visible watermark.

## Gaps / Mismatches
- File > Place Linked, linked Smart Objects, PSD round-trip, and automatic linked updates are excluded.
- No dedicated watermark workflow was found.

## Scope Decision
Out of scope.

## Recommended Follow-up
No action.
