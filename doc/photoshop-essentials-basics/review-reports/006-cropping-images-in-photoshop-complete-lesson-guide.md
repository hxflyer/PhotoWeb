# 006 cropping-images-in-photoshop-complete-lesson-guide
- Lesson path: `doc/photoshop-essentials-basics/cropping-images-in-photoshop-complete-lesson-guide/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 06-crop

## Lesson Expectations
- Crop Tool from toolbar/shortcut, crop border handles, overlay, aspect/orientation controls, Classic Mode, hide cropped area, commit with checkmark/Enter, cancel with Esc.
- Also Image > Crop from a selection and Perspective Crop behavior.

## Photoweb Coverage
- Toolbar and shortcut registry expose Crop and Perspective Crop (`src/components/Panels/Toolbar.tsx:55`, `src/components/Panels/Toolbar.tsx:57`, `src/core/shortcuts.ts:98`).
- Crop Tool waits for Enter before document crop, supports Esc cancel and undo/redo (`src/tools/crop.ts:217`, `src/test/cropTool.test.ts:58`, `src/test/cropTool.test.ts:133`).
- Crop options include H hide cropped area, P Classic Mode, X orientation swap, and Perspective Crop commit (`src/test/06-crop.test.tsx:78`, `src/test/06-crop.test.tsx:94`, `src/test/06-crop.test.tsx:115`).
- Image > Crop crops to selection bounds (`src/store/documentSlice.ts:427`, `src/test/06-crop.test.tsx:135`).

## Gaps / Mismatches
- None found after checking lesson, scope, cluster docs, crop code, and crop tests.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
