# 018 hide-photoshop-with-screen-modes-and-interface-tricks
- Lesson path: `doc/photoshop-essentials-basics/hide-photoshop-with-screen-modes-and-interface-tricks/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 01d-screen-modes

## Lesson Expectations
- Tab hides tools/options/panels, Shift+Tab hides panels only, F cycles Standard > Full Screen With Menu Bar > Full Screen, Shift+F cycles back, Esc exits Full Screen.
- Screenshots include `2024-hide-interface-hide-tools-options-panels-9e68c1a4.jpg`, `2024-hide-interface-view-screen-modes-20d35f4e.jpg`, and `2024-hide-interface-full-screen-warning-97730f36.jpg`.

## Photoweb Coverage
- Layout conditionally hides chrome according to screen mode and Tab/Shift+Tab state (`src/components/layout/MainLayout.tsx:31`, `src/components/layout/MainLayout.tsx:35`, `src/components/layout/MainLayout.tsx:41`).
- Store cycles screen modes forward/back and persists them (`src/store/viewSlice.ts:348`, `src/test/01d-screen-modes.test.tsx:16`, `src/test/01d-screen-modes.test.tsx:27`, `src/test/01d-screen-modes.test.tsx:58`).
- App keyboard handling wires F/Shift+F, Tab/Shift+Tab, and Esc (`src/App.tsx:264`, `src/App.tsx:275`, `src/App.tsx:701`).
- Toolbar and View menu expose screen mode entries (`src/components/Panels/Toolbar.tsx:620`, `src/components/layout/MenuBar.tsx:636`).

## Gaps / Mismatches
- Photoshop's first-entry full-screen warning is not implemented; this is a minor browser-app divergence.
- Cycling open documents in full screen is excluded with multi-document UI.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
