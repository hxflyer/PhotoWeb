# 167 managing-panels-in-photoshop-cs6
- Lesson path: `doc/photoshop-essentials-basics/managing-panels-in-photoshop-cs6/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `01c-panels`

## Lesson Expectations
- Right-side panels are grouped by tabs; click tabs to switch, drag tabs to reorder or move between groups, and close/open panels via Window menu.
- Reset Essentials and workspace-specific panel columns appear in screenshots such as `interface-manage-panels-reset-essentials-d2bee4ba.gif` and `interface-manage-panels-drag-tab-29281870.gif`.
- Window menu checkmarks indicate open panels.

## Photoweb Coverage
- Right panel dock groups tabs and supports drag reorder with persisted `panelTabOrder` in `src/components/Panels/RightPanelDock.tsx:123` and `src/store/viewSlice.ts:330`.
- Panel flyouts are shared in `src/components/Panels/PanelFlyout.tsx:66`.
- Window menu exposes panel toggles and checked state in `src/components/layout/MenuBar.tsx:675`.
- Tests cover tab reorder and persistence in `src/test/01c-panels.test.tsx:81`.

## Gaps / Mismatches
- Dragging a tab into a different group and free-floating panels are not evident; current coverage is mainly in-dock reorder.
- Reset Essentials is a workspace feature and excluded; if users expect it from panel management, the absence should remain a deliberate divergence.

## Scope Decision
divergence already accepted.

## Recommended Follow-up
Consider documenting the accepted "docked panels only, no workspace reset" divergence if not already in the divergence log.
