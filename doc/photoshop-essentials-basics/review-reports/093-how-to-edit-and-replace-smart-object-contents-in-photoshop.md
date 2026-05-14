# 093 how-to-edit-and-replace-smart-object-contents-in-photoshop
- Lesson path: `doc/photoshop-essentials-basics/how-to-edit-and-replace-smart-object-contents-in-photoshop/lesson.md`
- Scope status: `out_of_scope: smart_objects`
- Cluster coverage: `none`

## Lesson Expectations
- Convert layer to Smart Object, add layer mask, transform contents inside a frame, double-click thumbnail to edit contents, and right-click Replace Contents (`smart-objects-edit-replace-contents-edit-contents-smart-object-bb7fc46b.png`).
- Masks/transforms persist while the internal image is swapped.

## Photoweb Coverage
- Layer masks, transform, and image placement exist separately (`src/store/layersSlice.ts:1290`, `src/hooks/useFreeEdit.ts:17`, `src/components/layout/MenuBar.tsx:177`).
- These support manual template-like workflows without smart-object indirection.

## Gaps / Mismatches
- Smart Object edit contents, Replace Contents, linked internal documents, and smart-object thumbnails are excluded.

## Scope Decision
Out of scope.

## Recommended Follow-up
No action.
