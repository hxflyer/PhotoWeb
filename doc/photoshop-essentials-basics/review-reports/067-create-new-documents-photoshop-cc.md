# 067 create-new-documents-photoshop-cc
- Lesson path: `doc/photoshop-essentials-basics/create-new-documents-photoshop-cc/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 04b-file-new

## Lesson Expectations
- File > New / `Ctrl/Cmd+N` opens New Document dialog; Home Screen Create New is another entry point.
- Dialog has categories/preset thumbnails, right-side Preset Details, Width/Height/Resolution/Orientation, Color Mode/Bit Depth, Background Contents, saved presets, Create and Close buttons.
- Screenshots grounding UI: `02-opening-images-03-create-new-document-photoshop-file-new-command-edeadb8e.png`, `02-opening-images-03-create-new-document-photoshop-cc-new-document-dialog-cc3ddc6f.jpg`, `02-opening-images-03-create-new-document-preset-details-panel-e69562bd.png`.

## Photoweb Coverage
- File > New has `⌘N` in `src/components/layout/MenuBar.tsx:175`.
- New Document dialog implements Recent/Saved/Photo/Web tabs, Preset Details, editable Width/Height/Resolution, orientation buttons, background choices, Save Preset, Close/Create in `src/components/Dialogs/NewDocumentDialog.tsx:66`.
- Store creates document with resolution, background layer locking, and browser memory guard in `src/store/documentSlice.ts:488`.
- Tests cover clipboard prefill, categories, orientation, custom background, document naming, saved presets in `src/test/04b-file-new.test.tsx:57`.

## Gaps / Mismatches
- Home Screen Create New is excluded.
- Print/Mobile/Film & Video categories and Color Mode/Bit Depth controls are not present; color management/prepress is excluded.
- Dialog is a compact curated equivalent, not full Photoshop preset marketplace parity.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action unless additional document preset categories are requested for web/photo workflows.

