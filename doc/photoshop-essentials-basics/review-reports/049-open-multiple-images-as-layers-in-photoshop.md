# 049 open-multiple-images-as-layers-in-photoshop
- Lesson path: `doc/photoshop-essentials-basics/open-multiple-images-as-layers-in-photoshop/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 04a-file-open-place

## Lesson Expectations
- File > Scripts > Load Files into Stack opens a dialog where Browse selects multiple files, removes entries, and loads each image as a named layer.
- Place Embedded imports one image into an existing document as a new layer; Place Linked and Smart Object stack options are avoided or out of scope.
- Screenshots grounding UI: `2024-import-images-as-layers-load-files-into-stack-f1cfe3e0.png`, `2024-import-images-as-layers-load-layers-dialog-4c159461.png`, `2024-import-images-as-layers-new-photoshop-document-created-517f396a.jpg`, `2024-import-images-as-layers-place-embedded-command-24e009f7.png`.

## Photoweb Coverage
- File menu exposes `Place Embedded…` and `Scripts > Load Files into Stack…` in `src/components/layout/MenuBar.tsx:177`.
- Shared ingest pipeline routes first image to new doc only when no doc exists; otherwise adds selected images as layers in order in `src/utils/fileIngest.ts:59`.
- App file handlers call open image, import image, and stack ingest in `src/App.tsx:914`.
- Tests cover routing, multi-file order, and mixed-file rejection in `src/test/04a-file-open-place.test.tsx:52`.

## Gaps / Mismatches
- No Photoshop-style Load Layers dialog with a visible removable file list; browser multi-select acts as the simplified picker.
- No `Attempt to Automatically Align Source Images`; likely acceptable for photo-editor core, but not implemented.
- No `Create Smart Object after Loading Layers`, correctly excluded.
- Place/drop does not appear to pre-arm Free Transform before committing the layer.

## Scope Decision
divergence already accepted

## Recommended Follow-up
Consider a lightweight Load Files into Stack dialog with removable file list if users need to audit layer order before import.

