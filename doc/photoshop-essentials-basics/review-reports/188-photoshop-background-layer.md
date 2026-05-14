# 188 photoshop-background-layer
- Lesson path: `doc/photoshop-essentials-basics/photoshop-background-layer/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `07b-background-layer`

## Lesson Expectations
- CS5-era Background behavior mirrors lesson 187: italic name, lock icon, cannot move, cannot create transparent pixels, cannot reorder (`layers-background-layer-photoshop-background-layer-e90fec80.gif`).
- Backspace/Delete after a selection opens/follows Fill behavior instead of transparency (`layers-background-layer-fill-dialog-box-20b41006.gif`).
- Double-click/rename unlocks to normal editable layer.

## Photoweb Coverage
- Same Background coverage as lesson 187: creation in `src/store/documentSlice.ts:593`, conversion/restrictions in `src/store/layersSlice.ts:169`, and UI disabling in `src/components/Panels/LayersPanel.tsx:642`.
- Tests cover locked Background layer behavior in `src/test/07b-background-layer.test.tsx:38`.

## Gaps / Mismatches
- The CS5 Fill dialog/delete-specific behavior is not clearly covered by the tests inspected.

## Scope Decision
Fix.

## Recommended Follow-up
Share the same Background selection-delete follow-up as lesson 187; no separate implementation path needed.
