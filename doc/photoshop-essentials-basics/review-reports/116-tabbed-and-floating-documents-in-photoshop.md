# 116 tabbed-and-floating-documents-in-photoshop
- Lesson path: `doc/photoshop-essentials-basics/tabbed-and-floating-documents-in-photoshop/lesson.md`
- Scope status: `out_of_scope: multi_doc_ui`
- Cluster coverage: `none`

## Lesson Expectations
- Document tabs show filenames, Ctrl+Tab switches tabs, dragging a tab creates a floating document window, Arrange > Float All in Windows / Consolidate All to Tabs controls layout, and Preferences > Interface controls tab/floating defaults (`interface-tabbed-documents-photoshop-create-floating-document-b8fa6646.png`, `interface-tabbed-documents-photoshop-consolidate-all-to-tabs-17afaeaa.png`).

## Photoweb Coverage
- Document tab chrome exists and shows filename/zoom/RGB/dirty marker (`src/components/layout/DocumentTab.tsx:7`, `src/test/01a-interface-shell.test.tsx:45`).
- Multiple documents can switch through tabs (`src/test/08c-doc-transfer.test.tsx:55`).

## Gaps / Mismatches
- Floating document windows, tab drag-out/dock, and open-as-tabs preferences are excluded as multi-document UI.

## Scope Decision
Out of scope.

## Recommended Follow-up
No action.
