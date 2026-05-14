# 166 photoshop-cs6-workspaces
- Lesson path: `doc/photoshop-essentials-basics/photoshop-cs6-workspaces/lesson.md`
- Scope status: `out_of_scope: workspaces`
- Cluster coverage: `none`

## Lesson Expectations
- Workspace selector in the top-right switches Essentials/Painting/Photography layouts; screenshots include `interface-workspaces-workspace-selection-box-42eb38ba.jpg`.
- New Workspace saves panel positions, keyboard shortcuts, and menus; Reset Essentials restores defaults.
- Panel columns can resize/collapse as part of saved workspace state.

## Photoweb Coverage
- Photoweb has panel visibility, tab order, and collapsed group persistence in `src/store/viewSlice.ts:330` and `src/components/Panels/RightPanelDock.tsx:123`.
- Window menu toggles individual panels in `src/components/layout/MenuBar.tsx:675`.
- Work queue intentionally covers panels in `01c-panels`, not named workspace management.

## Gaps / Mismatches
- No workspace selector, New Workspace dialog, saved workspace presets, or Reset Essentials command.
- Keyboard-shortcut/menu customization persistence from this lesson is explicitly excluded with workspaces/custom shortcuts.

## Scope Decision
out of scope.

## Recommended Follow-up
No action.
