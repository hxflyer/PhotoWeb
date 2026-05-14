# 004 photoshop-image-navigation
- Lesson path: `doc/photoshop-essentials-basics/photoshop-image-navigation/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 03-navigation

## Lesson Expectations
- Zoom Tool, Hand Tool, Fit on Screen, 100%, scrubby zoom, keyboard shortcuts, status-bar zoom entry, and wheel/temporary-tool navigation.
- Screenshot `cc-navigating-images-complete-guide-navigating-images-photoshop-guide-fl-d311d3a9.jpg` grounds the navigation tool surface.

## Photoweb Coverage
- Zoom math anchors the pixel under the pointer and clamps scale (`src/test/03-navigation.test.tsx:40`, `src/test/03-navigation.test.tsx:55`).
- Zoom Tool supports click zoom, Alt-click zoom out, and scrubby horizontal drag (`src/test/03-navigation.test.tsx:64`, `src/test/03-navigation.test.tsx:73`, `src/test/03-navigation.test.tsx:81`).
- Editable status-bar zoom supports Enter commit and Esc revert (`src/components/layout/StatusBar.tsx:70`, `src/test/03-navigation.test.tsx:102`).
- View menu exposes zoom commands and screen modes (`src/components/layout/MenuBar.tsx:630`, `src/components/layout/MenuBar.tsx:636`).

## Gaps / Mismatches
- Birds Eye View, Rotate View, Overscroll, and Navigator are excluded navigation extras (`CLAUDE.md:141`, `doc/photoshop-essentials-basics/divergence-log.md:165`).
- A Navigator panel still exists in code (`src/components/Panels/NavigatorPanel.tsx:7`, `src/components/Panels/RightPanelDock.tsx:386`), which conflicts with the strict exclusion language even if it is not central to this lesson.

## Scope Decision
needs product decision

## Recommended Follow-up
Decide whether the existing Navigator panel should remain as an accepted divergence or be hidden/removed to match the explicit `nav_extras` exclusion.
