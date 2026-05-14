# 113 photoshop-screen-modes-interface-tricks
- Lesson path: `doc/photoshop-essentials-basics/photoshop-screen-modes-interface-tricks/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `01d-screen-modes`

## Lesson Expectations
- View > Screen Mode and toolbar icon switch Standard, Full Screen Mode With Menu Bar, and Full Screen Mode (`interface-screen-modes-photoshop-screenmodes-viewmenu-21f7c3ea.png`, `interface-screen-modes-photoshop-screenmodes-toolbarmenu-fc09ce51.png`).
- F cycles forward, Shift+F cycles backward, Esc exits full screen, Tab hides panels, side hover reveals toolbar/panels in Full Screen (`interface-screen-modes-photoshop-screenmodes-fullscreen-toolbar-f0270d7d.jpg`).

## Photoweb Coverage
- View > Screen Mode menu items exist (`src/components/layout/MenuBar.tsx:635`).
- Screen mode state hides chrome in layout (`src/components/layout/MainLayout.tsx:37`).
- Tests cover three modes, F/Shift+F, Esc, and toolbar flyout (`src/test/01d-screen-modes.test.tsx:15`, `src/test/screenModeAndShortcuts.test.tsx:14`).
- Tab/Shift+Tab chrome hiding is wired (`src/App.tsx:533`).

## Gaps / Mismatches
- Edge-hover reveal in Full Screen is explicitly logged as an accepted divergence (`doc/photoshop-essentials-basics/divergence-log.md:119`).
- Full Screen warning dialog from Photoshop was not found, likely an acceptable browser simplification.

## Scope Decision
Divergence already accepted.

## Recommended Follow-up
No action.
