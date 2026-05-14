# 091 how-to-merge-layers-as-smart-objects-in-photoshop
- Lesson path: `doc/photoshop-essentials-basics/how-to-merge-layers-as-smart-objects-in-photoshop/lesson.md`
- Scope status: `out_of_scope: smart_objects`
- Cluster coverage: `none`

## Lesson Expectations
- Select layers and use Layers panel menu > Convert to Smart Object (`smart-objects-merge-layers-convert-to-smart-object-photoshop-bb93b5a5.png`).
- Double-click smart object thumbnail to edit embedded layers, save, close, and update the parent (`smart-objects-merge-layers-edit-smart-object-photoshop-065eaeb4.png`).
- Smart Filters preserve editable sharpening.

## Photoweb Coverage
- Layer merge/stamp/flatten operations exist for destructive compositing (`src/store/layersSlice.ts:1058`, `src/store/layersSlice.ts:1074`, `src/components/Panels/LayersPanel.tsx:1116`).
- Layer effects and adjustment layers cover some non-destructive editing, but not containerized Smart Objects.

## Gaps / Mismatches
- Convert to Smart Object, embedded documents, smart-object thumbnails, and Smart Filters are excluded.
- Destructive merge is not a substitute for this lesson's non-destructive workflow.

## Scope Decision
Out of scope.

## Recommended Follow-up
No action.
