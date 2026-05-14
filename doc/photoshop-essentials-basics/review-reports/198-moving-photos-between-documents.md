# 198 moving-photos-between-documents
- Lesson path: `doc/photoshop-essentials-basics/moving-photos-between-documents/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `08c-doc-transfer`

## Lesson Expectations
- With floating documents, Move Tool drag copies a layer/image between documents; holding Shift centers it (`move-between-docs-drag-photo-763b76ca.jpg`, `move-between-docs-water-drops-photo-centered-28489de3.jpg`).
- Alternative methods: duplicate layer with destination document, copy/paste, and active document Layers panel switches.

## Photoweb Coverage
- Store can duplicate a layer to another document and center it with a `center` flag in `src/store/documentSlice.ts:657`.
- Copy/paste transfer path exists in `src/store/documentSlice.ts:705` and menu paste handlers in `src/components/layout/MenuBar.tsx:227`.
- Tests cover duplicate-to-document, paste transferred layer, and document layout switching in `src/test/08c-doc-transfer.test.tsx:79`.

## Gaps / Mismatches
- Direct Move Tool drag across document windows is limited by Photoweb's one-document UI target; existing support is command/clipboard based.
- Shift-to-center transfer needs explicit test confirmation for all invocation paths.

## Scope Decision
divergence already accepted.

## Recommended Follow-up
Confirm/document the accepted no-full-multi-document-drag divergence and add Shift-center tests where command paths support centering.
