# gap-report — 01d-screen-modes

## Lessons reviewed

- `hide-photoshop-with-screen-modes-and-interface-tricks` (Photoshop 2025) — Tab / Shift+Tab to hide chrome (already shipped in 01c), three screen modes (Standard / Full Screen With Menu Bar / Full Screen), F cycles forward, Shift+F cycles backward, Esc exits Full Screen, View > Screen Mode menu, toolbar Screen Mode icon at the bottom (click-and-hold for flyout), Full-Screen warning dialog, hover-near-edge auto-reveal in Full Screen.
- `photoshop-screen-modes-interface-tricks` (CC/CS6 variant) — Same three modes, same toolbar icon and View menu locations, square indicator next to active mode in the toolbar flyout, checkmark next to active in the View > Screen Mode submenu.

## Current photoweb coverage

- [src/App.tsx:71-78](src/App.tsx#L71-L78) defines `SCREEN_MODES = ['photoweb-standard', 'photoweb-full-with-menu', 'photoweb-full']` and a `cycleScreenMode` function that flips body classes; a module-level `screenModeIndex` tracks position.
- [src/App.tsx:454-461](src/App.tsx#L454-L461) wires `F` / `Shift+F` to call `cycleScreenMode`.
- **But there are NO CSS rules for `.photoweb-full-with-menu` or `.photoweb-full` anywhere in [src/index.css](src/index.css) or [src/App.css](src/App.css).** The body classes flip but nothing visually changes. The feature is dead-on-arrival.
- No View > Screen Mode submenu in [MenuBar.tsx](src/components/layout/MenuBar.tsx).
- No Screen Mode icon at the bottom of [Toolbar.tsx](src/components/Panels/Toolbar.tsx).
- No `Esc` handler that exits Full Screen Mode.
- Existing `chromeHidden` (from 01c) controls Tab/Shift+Tab visibility; screen modes are a separate, orthogonal axis (Photoshop layers Tab on top of whichever screen mode is active).

## Gaps

| # | Gap | Where |
|---|---|---|
| 1 | F/Shift+F flip body classes but no CSS responds. | Missing `.photoweb-full-with-menu` / `.photoweb-full` rules in [src/index.css](src/index.css). Better: drive layout in [MainLayout.tsx](src/components/layout/MainLayout.tsx) from a store field (consistent with 01c's `chromeHidden`). |
| 2 | Module-level `screenModeIndex` instead of store state. | [App.tsx:72](src/App.tsx#L72). Move to viewSlice for menu + toolbar + keyboard parity. |
| 3 | No View > Screen Mode submenu. | [MenuBar.tsx Window section](src/components/layout/MenuBar.tsx) (View is between Filter and Window; the submenu belongs after `Fit on Screen`/etc.). |
| 4 | No toolbar Screen Mode icon at the bottom of the toolbar. | [Toolbar.tsx](src/components/Panels/Toolbar.tsx) — add an icon button below the Quick Mask button. |
| 5 | No `Esc` to exit Full Screen Mode. | New global handler in [App.tsx](src/App.tsx). |
| 6 | Shift+F from Standard jumps only one step (to Full Screen With Menu Bar), not directly to Full Screen as the lesson says. | Same `cycleScreenMode` handler — Shift+F should jump backward in the cycle, which from Standard wraps to Full Screen. Already correct (cycle wraps), but verify after store migration. |

## Photoshop-habit mismatches

1. **Three exact mode names**: `Standard Screen Mode`, `Full Screen Mode With Menu Bar`, `Full Screen Mode`. Grounded in `photoshop-screen-modes-interface-tricks/images/interface-screen-modes-photoshop-screenmodes-toolbarmenu-fc09ce51.png` (toolbar flyout) and `…viewmenu-21f7c3ea.png` (View > Screen Mode submenu).
2. **F shortcut shown in both menu and toolbar flyout** for all three entries. Photoshop displays `F` as the shortcut next to each entry even though F cycles between them (every entry can be the target of F depending on current mode).
3. **Toolbar icon position**: at the bottom of the toolbar (last item). Grounded in `…interface-screen-modes-photoshop-screenmodes-toolbarmenu-fc09ce51.png` (icon circled at the bottom).
4. **Active-mode indicator**: View menu uses a checkmark; toolbar flyout uses a small filled square next to the active mode. Grounded in screenshots above.
5. **F cycles forward (Standard → Full-With-Menu → Full → Standard)**; **Shift+F cycles backward**. Grounded in lesson body lines 71-74.
6. **Esc exits Full Screen back to Standard.** Grounded in lesson body line 153.

## UI / UX issues separate from §4

- Photoshop shows a confirmation dialog when first entering Full Screen Mode ("the interface will be hidden, click Full Screen to accept"). photoweb users have F as a familiar keyboard tap; the warning is mostly anti-confusion. For a Photoshop user, the warning is recognizable; for a new user, it's helpful. Decision: defer the warning dialog this tick; F still hides chrome and Esc still restores. Note in divergence-log.
- Hover-near-edge auto-reveal in Full Screen Mode (lesson body lines 124-140): convenience. Defer.

## Photoshop divergences worth keeping

- **No Full-Screen-Mode warning dialog this tick** — F immediately enters Full Screen; Esc / F exits. Log as deferred.
- **No hover-near-edge auto-reveal** in Full Screen Mode. Log as deferred.
- **No multi-document cycling shortcuts** (Ctrl+Tab / Ctrl+Shift+Tab) — multi-document is excluded per CLAUDE.md §4. Log as permanent.
