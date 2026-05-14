# 221 why-make-selections
- Lesson path: `doc/photoshop-essentials-basics/why-make-selections/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `11a-selections-overview`

## Lesson Expectations
- Selections protect unselected pixels and constrain painting, adjustments, copies, and layer operations.
- Marching ants visualize selected areas; hiding edges with `Ctrl/Cmd+H` does not deselect.
- `Select > Deselect` / `Ctrl/Cmd+D` removes the selection; selected pixels can become layer content.
- UI screenshots: `selections-why-photoshop-selection-outline-3d297025.jpg`, `selections-why-painting-inside-selection-f4b2352a.jpg`, `selections-why-selected-area-new-layer-3d71918e.jpg`.

## Photoweb Coverage
- Selection operations rasterize true masks and constrain edits (`src/tools/selectionModifiers.ts:5-77`, `src/store/selectionSlice.ts:836-892`).
- Marching ants render from the rasterized selection mask (`src/components/Canvas/Viewport.tsx:712-747`).
- Menu and shortcuts expose Deselect (`src/components/layout/MenuBar.tsx:543`, `src/core/shortcuts.ts:63`).
- Tests cover selection modifiers and selection-constrained operations (`src/test/11a-selections-overview.test.tsx`, `src/test/selectionWorkflowBatch5.test.tsx`).

## Gaps / Mismatches
- Need to verify `Ctrl/Cmd+H` edge hiding is exposed consistently in menus/shortcuts; the selection state has edge-hiding fields but coverage was not obvious in this slice.

## Scope Decision
Fix.

## Recommended Follow-up
Add or verify a shortcut/menu test for Show/Hide Extras or selection edges (`Ctrl/Cmd+H`) that preserves the active selection.
