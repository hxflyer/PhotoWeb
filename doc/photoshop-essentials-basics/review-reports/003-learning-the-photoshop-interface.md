# 003 learning-the-photoshop-interface
- Lesson path: `doc/photoshop-essentials-basics/learning-the-photoshop-interface/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 01a-interface-shell

## Lesson Expectations
- Photoshop shell: menu bar, document tab with filename/zoom/color mode, tool/options bars, panels, pasteboard, status bar, and color theme.
- Screenshot `learning-the-photoshop-interface-learn-photoshop-interface-fl-19983cc6.jpg` grounds the standard Photoshop workspace layout.

## Photoweb Coverage
- Document tab renders filename, zoom percent, RGB/8, dirty marker, and close affordance (`src/components/layout/DocumentTab.tsx:7`, `src/components/layout/DocumentTab.tsx:113`, `src/test/01a-interface-shell.test.tsx:44`).
- Status bar provides editable zoom, info modes, click-and-hold document dimensions, active tool, and cursor coordinates (`src/components/layout/StatusBar.tsx:70`, `src/components/layout/StatusBar.tsx:322`, `src/test/01a-interface-shell.test.tsx:79`).
- Pasteboard right-click color presets and custom color are implemented (`src/components/layout/PasteboardContextMenu.tsx:27`, `src/test/01a-interface-shell.test.tsx:152`).

## Gaps / Mismatches
- Photoshop status bar entries tied to Adobe Drive, profiles, Smart Objects, HDR, and save-engine internals are omitted; this is logged as an accepted scope divergence (`doc/photoshop-essentials-basics/divergence-log.md:22`).

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
