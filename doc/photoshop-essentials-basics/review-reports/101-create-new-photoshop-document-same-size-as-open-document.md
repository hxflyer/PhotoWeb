# 101 create-new-photoshop-document-same-size-as-open-document
- Lesson path: `doc/photoshop-essentials-basics/create-new-photoshop-document-same-size-as-open-document/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `04b-file-new`

## Lesson Expectations
- Select Background layer, Select > All, Edit > Copy, File > New; New Document auto-fills Width, Height, and Resolution from clipboard image info (`cc-open-document-same-size-photoshop-new-document-details-865c5237.png`).

## Photoweb Coverage
- New Document dialog reads `clipboardImageInfo` to prefill dimensions/resolution (`src/components/Dialogs/NewDocumentDialog.tsx:73`, `src/components/Dialogs/NewDocumentDialog.tsx:242`).
- Tests cover Cmd+A/Cmd+C/Cmd+N clipboard-driven prefill and focused-input safety (`src/test/04b-file-new.test.tsx:57`, `src/test/04b-file-new.test.tsx:95`).
- Menu Copy records image info for New Document use (`src/components/layout/MenuBar.tsx:220`, `src/store/documentSlice.ts:545`).

## Gaps / Mismatches
- None found for the core same-size new-document flow.

## Scope Decision
Fix not needed.

## Recommended Follow-up
No action.
