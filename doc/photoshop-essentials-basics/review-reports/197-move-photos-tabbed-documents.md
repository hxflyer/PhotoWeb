# 197 move-photos-tabbed-documents
- Lesson path: `doc/photoshop-essentials-basics/move-photos-tabbed-documents/lesson.md`
- Scope status: `out_of_scope: multi_doc_ui`
- Cluster coverage: `none`

## Lesson Expectations
- Drag Move Tool content from a source tab to a destination document tab; hover tab to switch, continue into canvas, release (`move-photos-tabbed-docs-drag-photo-onto-tab-cc04776f9.jpg`).
- Preferences can disable Open Documents As Tabs; Arrange Documents can float windows.

## Photoweb Coverage
- Photoweb has internal document records and a simple `documentLayout` tabs/2-up state in `src/store/documentSlice.ts:247`.
- Menu has Arrange items for tabs/2-up/Float All in Windows in `src/components/layout/MenuBar.tsx:677`, mainly supporting the limited doc-transfer cluster.

## Gaps / Mismatches
- Tab-hover drag transfer and full tabbed/floating multi-document UI are explicitly excluded by `multi_doc_ui`.

## Scope Decision
out of scope.

## Recommended Follow-up
No action.
