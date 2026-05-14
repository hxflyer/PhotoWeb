# 112 how-to-use-the-navigator-panel-in-photoshop
- Lesson path: `doc/photoshop-essentials-basics/how-to-use-the-navigator-panel-in-photoshop/lesson.md`
- Scope status: `out_of_scope: nav_extras`
- Cluster coverage: `none`

## Lesson Expectations
- Window > Navigator opens a resizable Navigator panel with thumbnail, red view box, slider, mountain zoom icons, editable percentage, scrubby zoom, manual zoom rectangle, view-box color options, and hide command (`2022-navigator-panel-photoshop-navigator-panel-0787f39c.png`, `2022-navigator-panel-panel-options-dialog-box-b25f1c16.png`).

## Photoweb Coverage
- A Navigator panel exists with thumbnail, view rectangle, click-to-pan, slider, and zoom buttons (`src/components/Panels/NavigatorPanel.tsx:7`, `src/components/Panels/NavigatorPanel.tsx:130`).
- Window > Navigator toggles visibility (`src/components/layout/MenuBar.tsx:697`).

## Gaps / Mismatches
- Despite partial implementation, Navigator panel is listed as an explicit nav-extra exclusion in the app contract.
- Resizing, editable percent field, scrubby zoom, drawn zoom rectangle, and view-box color options were not confirmed.

## Scope Decision
Out of scope by contract, with partial implementation already present.

## Recommended Follow-up
No action unless product re-includes Navigator; if kept visible, either finish the missing Photoshop affordances or document it as a deliberate lightweight panel.
