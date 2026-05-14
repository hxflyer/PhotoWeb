# 117 managing-panels-photoshop-cc
- Lesson path: `doc/photoshop-essentials-basics/managing-panels-photoshop-cc/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `01c-panels`

## Lesson Expectations
- Right-side panel area with grouped tabs; users reorder tabs, move panels between groups, create new groups, collapse/expand groups, close panels/groups, use panel menu icon, and reset Essentials workspace (`interface-panels-photoshop-main-panel-column-238751a1.png`, `interface-panels-photoshop-moving-panels-between-groups-781aee1f.png`, `interface-panels-photoshop-close-panel-14edd087.png`).

## Photoweb Coverage
- RightPanelDock groups Color/Swatches/etc., Character/Paragraph, and Layers/Channels/Paths/etc. (`src/components/Panels/RightPanelDock.tsx:364`).
- Panel group chrome supports tab picking, drag reorder, collapse, panel menu, close panel/group (`src/components/Panels/RightPanelDock.tsx:122`, `src/components/Panels/RightPanelDock.tsx:214`).
- Tests cover close, close group, drag reorder, collapse, and persistent tab order (`src/test/01c-panels.test.tsx:35`, `src/test/01c-panels.test.tsx:80`, `src/test/01c-panels.test.tsx:105`).

## Gaps / Mismatches
- Floating panels and arbitrary moving panels between groups are accepted divergences (`doc/photoshop-essentials-basics/divergence-log.md:75`).
- Reset Essentials/workspace reset is excluded/accepted (`doc/photoshop-essentials-basics/divergence-log.md:93`).

## Scope Decision
Divergence already accepted.

## Recommended Follow-up
No action.
