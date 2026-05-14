# 224 interface
- Lesson path: `doc/photoshop-essentials-basics/interface/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `01a-interface-shell`

## Lesson Expectations
- Photoshop CS4 shell includes Menu Bar, Tools panel, Options Bar, Application Bar, panel docks/groups, Workspaces, Document Window/status bar, and Application Frame.
- Tools panel can switch single/double column and show flyout tools; Options Bar changes per tool.
- Application Bar contains Bridge, View Extras, zoom proxies, Arrange Documents, and Screen Mode controls.
- UI screenshots: `photoshop-cs4-interface-photoshop-cs4-interface-4782d2fa.jpg`, `photoshop-cs4-interface-photoshop-cs4-tools-panel-19dce5cd.gif`, `photoshop-cs4-interface-photoshop-cs4-application-bar-89153331.gif`.

## Photoweb Coverage
- Main shell has MenuBar, Toolbar, OptionsBar, DocumentTab, StatusBar, pasteboard, and right panel dock (`src/components/layout/MainLayout.tsx:108-120`, `src/components/layout/DocumentTab.tsx`, `src/components/layout/StatusBar.tsx:168`).
- Toolbar groups/flyouts and one/two-column behavior are implemented (`src/components/Panels/Toolbar.tsx:150-340`).
- Options Bar switches by active tool (`src/components/Panels/OptionsBar.tsx:2432-2493`).
- Window menu toggles panels (`src/components/layout/MenuBar.tsx:675-701`); panel dock groups visible tabs (`src/components/Panels/RightPanelDock.tsx:365-420`).
- Tests cover interface shell, toolbar, panels, and preferences categories (`src/test/01a-interface-shell.test.tsx`, `src/test/01b-toolbar.test.tsx`, `src/test/01c-panels.test.tsx`, `src/test/02-preferences.test.tsx`).

## Gaps / Mismatches
- Application Bar items tied to Bridge, Arrange Documents, Rotate View, and Workspaces are intentionally excluded.
- Workspaces/custom layout behavior is excluded, but the lesson includes it; this is a deliberate scope divergence.

## Scope Decision
divergence already accepted.

## Recommended Follow-up
No action unless new UI introduces Application Bar-like controls that imply excluded features.
