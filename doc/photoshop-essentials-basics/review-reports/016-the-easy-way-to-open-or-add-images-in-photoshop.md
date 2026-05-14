# 016 the-easy-way-to-open-or-add-images-in-photoshop
- Lesson path: `doc/photoshop-essentials-basics/the-easy-way-to-open-or-add-images-in-photoshop/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 04a-file-open-place

## Lesson Expectations
- Drag an image onto the Home Screen/empty workspace to open a new document; drag onto an open document to add as a layer; drag multiple images to import as layers and commit placement.
- Screenshots include `2024-drag-and-drop-images-drag-and-drop-home-screen-a5eb9d8e.jpg`, `2024-drag-and-drop-images-drag-and-drop-to-import-image-as-layer-d436a49d.jpg`, and `2024-drag-and-drop-images-images-imported-as-layers-photoshop-6225e71e.jpg`.

## Photoweb Coverage
- Viewport drop handler routes image and `.pwbdoc` drops through the shared ingest pipeline (`src/components/Canvas/Viewport.tsx:1511`, `src/utils/fileIngest.ts:55`).
- Tests cover single layer add, multiple layer add, order preservation, and mixed unsupported files (`src/test/04a-file-open-place.test.tsx:63`, `src/test/04a-file-open-place.test.tsx:97`, `src/test/04a-file-open-place.test.tsx:123`, `src/test/04a-file-open-place.test.tsx:128`).

## Gaps / Mismatches
- No Photoshop Home Screen; dropping on blank workspace opens directly. This is already logged as accepted (`doc/photoshop-essentials-basics/divergence-log.md:195`).
- Imported image placement is simpler than Photoshop's Smart Object/free-transform placement because Smart Objects are excluded.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
