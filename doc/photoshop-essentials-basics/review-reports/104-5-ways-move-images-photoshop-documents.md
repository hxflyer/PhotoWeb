# 104 5-ways-move-images-photoshop-documents
- Lesson path: `doc/photoshop-essentials-basics/5-ways-move-images-photoshop-documents/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `08c-doc-transfer`

## Lesson Expectations
- Move images between open documents by Copy/Paste, Duplicate Layer dialog with destination document, tab-hover drag-and-drop, multi-document layout drag, and floating-window drag (`interface-move-images-between-documents-photoshop-duplicate-layer-dialog-box-e5fc38a1.png`, `interface-move-images-between-documents-photoshop-document-tab-0799fe0d.png`).
- Dragging between tabs requires hovering target tab until it becomes active.

## Photoweb Coverage
- Multiple open documents and document tabs are tested (`src/test/08c-doc-transfer.test.tsx:55`).
- Duplicate layer to another document is implemented (`src/store/documentSlice.ts:657`, `src/test/08c-doc-transfer.test.tsx:73`).
- Copy/Paste and Paste in Place menu entries exist (`src/components/layout/MenuBar.tsx:220`).
- Arrange commands are exposed but accepted as limited (`doc/photoshop-essentials-basics/divergence-log.md:375`).

## Gaps / Mismatches
- Live multi-document layouts/floating windows and tab-hover drag transfers are not implemented.
- Duplicate Layer destination appears as submenu destinations, not Photoshop's Duplicate Layer dialog with a destination dropdown.

## Scope Decision
Divergence already accepted for tiled/floating windows; Duplicate Layer dialog parity needs product decision.

## Recommended Follow-up
Consider a Duplicate Layer dialog only if users need stronger Photoshop dialog fidelity; no action on floating/tiled drag.
