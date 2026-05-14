# 203 quick-selection-tool
- Lesson path: `doc/photoshop-essentials-basics/quick-selection-tool/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `14a-content-selection-tools`

## Lesson Expectations
- W selects Quick Selection, nested with Magic Wand/Object Selection (`selections-quick-selection-tool-photoshop-quick-selection-tool-4b7ff83d.gif`).
- Tool paints like a brush and defaults to Add to Selection with plus cursor; Options Bar has New/Add/Subtract modes (`selections-quick-selection-tool-three-selection-modes-31049232.gif`).
- Ctrl/Cmd+Z undoes last stroke; subtract mode removes accidental areas; brush options and Auto-Enhance appear as additional options.

## Photoweb Coverage
- W shortcut group includes quick-selection/magic-wand/object-selection in `src/App.tsx:720`.
- Content selection tests cover tool modes and Shift/Alt refinement behavior in `src/test/14a-content-selection-tools.test.tsx:120`.
- Quick Selection tool implementation is in `src/tools/quickSelection.ts`.

## Gaps / Mismatches
- Need direct confirmation that Quick Selection defaults to Add mode and cursor shows plus without Shift.
- Auto-Enhance and full Photoshop edge-growing algorithm are likely simplified.

## Scope Decision
Fix.

## Recommended Follow-up
Add tests for default Add cursor/mode and document any algorithmic simplification as an accepted browser-editor divergence.
