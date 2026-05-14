# 115 view-multiple-images-photoshop
- Lesson path: `doc/photoshop-essentials-basics/view-multiple-images-photoshop/lesson.md`
- Scope status: `out_of_scope: multi_doc_ui`
- Cluster coverage: `none`

## Lesson Expectations
- Window > Arrange shows 2-up/3-up layouts, active document highlighting, grouped tabs, tab reordering, drag between windows, zoom/pan in layouts, Match Zoom/Location/Rotation, and Consolidate All to Tabs (`interface-arrange-documents-photoshop-arange-2-up-vertical-92a61f9a.png`, `interface-arrange-documents-photoshop-match-zoom-location-rotation-f773ef88.png`).

## Photoweb Coverage
- Multiple document tabs and a `documentLayout` state exist (`src/store/types.ts:258`, `src/test/08c-doc-transfer.test.tsx:55`).
- Arrange commands are present, but divergence log states they do not render live tiled/floating viewports (`doc/photoshop-essentials-basics/divergence-log.md:375`).

## Gaps / Mismatches
- Multi-document UI is explicitly excluded: no live 2-up/3-up canvas layouts, grouped windows, or synchronized zoom/location/rotation.

## Scope Decision
Out of scope.

## Recommended Follow-up
No action.
