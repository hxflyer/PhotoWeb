# 119 getting-know-photoshop-interface
- Lesson path: `doc/photoshop-essentials-basics/getting-know-photoshop-interface/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `01a-interface-shell`

## Lesson Expectations
- Identify Document Window, tab with filename/zoom/status, Status Bar info menu, Toolbar and flyouts, Options Bar, Menu Bar, right-side panels, panel tabs, Search, and Workspaces (`interface-overview-photoshop-document-window-tab-08cd471e.png`, `interface-overview-photoshop-status-bar-more-info-9ad721ea.png`, `interface-overview-photoshop-toolbar-hidden-tools-c41af9a0.png`).

## Photoweb Coverage
- Document tab mirrors Photoshop filename/zoom/(RGB/8)/dirty marker (`src/components/layout/DocumentTab.tsx:7`, `src/test/01a-interface-shell.test.tsx:45`).
- Status Bar has info modes and editable zoom (`src/components/layout/StatusBar.tsx:70`, `src/test/01a-interface-shell.test.tsx:75`).
- Toolbar, Options Bar, Menu Bar, and right panel dock are implemented (`src/components/Panels/Toolbar.tsx:29`, `src/components/Panels/OptionsBar.tsx:2446`, `src/components/layout/MenuBar.tsx`, `src/components/Panels/RightPanelDock.tsx:364`).

## Gaps / Mismatches
- Search bar and Workspaces from the overview are excluded or not implemented.
- Status Bar info menu intentionally omits scope-excluded entries (`doc/photoshop-essentials-basics/divergence-log.md:22`).

## Scope Decision
Divergence already accepted.

## Recommended Follow-up
No action.
