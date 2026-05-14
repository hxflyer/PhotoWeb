# 032 photoshop-tools-toolbar-overview
- Lesson path: `doc/photoshop-essentials-basics/photoshop-tools-toolbar-overview/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 01b-toolbar

## Lesson Expectations
- Photoshop toolbar grouping, single/double-column layout, hidden tools in flyouts, default tool per slot, tool shortcuts, and selecting hidden tools.
- Screenshots include `interface-tools-photoshop-toolbar-c8bde493.png`, `interface-tools-photoshop-double-column-toolbar-a03bf319.png`, and `interface-tools-photoshop-toolbar-select-hidden-tool-96c96cb1.png`.

## Photoweb Coverage
- Toolbar defines Photoshop-like grouped tools and shortcuts for Move, selection, crop, retouch, paint, type, shape, hand, and zoom (`src/components/Panels/Toolbar.tsx:30`, `src/components/Panels/Toolbar.tsx:32`, `src/components/Panels/Toolbar.tsx:134`).
- Press-and-hold flyout threshold and right-click alternate are implemented/tested (`src/components/Panels/Toolbar.tsx:145`, `src/test/01b-toolbar.test.tsx:38`, `src/test/01b-toolbar.test.tsx:77`).
- Selecting a sub-tool records group active state (`src/test/01b-toolbar.test.tsx:142`).

## Gaps / Mismatches
- Frame Tool and toolbar customization are omitted by explicit scope exclusions (`CLAUDE.md:140`, `CLAUDE.md:141`).

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
