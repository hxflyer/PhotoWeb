# 092 how-to-copy-smart-objects-in-photoshop
- Lesson path: `doc/photoshop-essentials-basics/how-to-copy-smart-objects-in-photoshop/lesson.md`
- Scope status: `out_of_scope: smart_objects`
- Cluster coverage: `none`

## Lesson Expectations
- Ctrl/Cmd+J duplicates a smart object as a linked copy; Layer > Smart Objects > New Smart Object via Copy creates an independent copy (`smart-objects-copy-new-layer-via-copy-command-photoshop-2c46643c.png`, `smart-objects-copy-new-smart-object-via-copy-command-d3f321ee.png`).
- Smart object icon and shared/independent content behavior are visible in the Layers panel.

## Photoweb Coverage
- Layer duplication exists (`src/store/layersSlice.ts:1617`) and duplicate-to-document exists (`src/store/documentSlice.ts:657`).
- Ctrl/Cmd+J layer-via-copy behavior is wired for selection workflows (`src/App.tsx:588`).

## Gaps / Mismatches
- Shared smart-object instance identity and independent "New Smart Object via Copy" are excluded.
- No Smart Objects submenu was found.

## Scope Decision
Out of scope.

## Recommended Follow-up
No action.
