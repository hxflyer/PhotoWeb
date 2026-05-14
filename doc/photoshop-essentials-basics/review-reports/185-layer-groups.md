# 185 layer-groups
- Lesson path: `doc/photoshop-essentials-basics/layer-groups/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `08a-layer-ops`

## Lesson Expectations
- Folder icon creates a new group; Ctrl/Cmd+G groups selected layers; disclosure triangle expands/collapses; group visibility eye hides all children (`layers-layer-groups-triangle-icon-928c360d.gif`, `layers-layer-groups-layer-group-visibility-icon-6510fe1c.gif`).
- Layers can move in/out of groups and groups can nest.

## Photoweb Coverage
- Store implements group creation, grouping, ungrouping, expansion, and moving layers to groups in `src/store/layersSlice.ts`.
- Menu and shortcut paths include Group Layers/Ungroup Layers in `src/components/layout/MenuBar.tsx:394` and `src/App.tsx:616`.
- Layers panel shows groups, folder icon, and disclosure/visibility controls in `src/components/Panels/LayersPanel.tsx:989`.
- Tests cover group operations in `src/test/08a-layer-ops.test.tsx` and `src/test/layersPanelDragGroup.test.tsx`.

## Gaps / Mismatches
- Nested group behavior and drag out/in edge cases should be checked against Photoshop if not covered by tests.
- No obvious major mismatch found in the basic group workflow.

## Scope Decision
Fix.

## Recommended Follow-up
Add or confirm nested-group drag tests with disclosure/visibility inheritance.
