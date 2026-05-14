# 012 brush-dynamics-intro
- Lesson path: `doc/photoshop-essentials-basics/brush-dynamics-intro/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 20a-brush-tool

## Lesson Expectations
- Select Brush Tool, open Brushes/Brush Settings panel, switch from decorative/custom brushes to a standard Hard Round brush.
- Screenshots `photoshop-brushes-brush-dynamics-photoshop-brush-tool-213383bc.gif`, `photoshop-brushes-brush-dynamics-brushes-palette-toggle-icon-37f6dc8f.gif`, and `photoshop-brushes-brush-dynamics-photoshop-brushes-panel-d08d1704.gif` ground the toolbar and panel UI.

## Photoweb Coverage
- Toolbar exposes Brush/Pencil group with shortcut B (`src/components/Panels/Toolbar.tsx:67`, `src/core/shortcuts.ts:92`).
- Options Bar exposes brush mode, size, hardness, opacity, flow, and Clear mode (`src/components/Panels/OptionsBar.tsx:153`, `src/components/Panels/OptionsBar.tsx:918`).
- Brushes panel has Brushes and Brush Settings tabs (`src/components/Panels/BrushPresetsPanel.tsx:166`, `src/components/Panels/BrushPresetsPanel.tsx:183`, `src/test/21-brush-dynamics.test.tsx:77`).
- Brush shortcuts, cursor, Alt eyedropper, and right-click preset picker are tested (`src/test/20a-brush-tool.test.tsx:56`, `src/test/20a-brush-tool.test.tsx:85`, `src/test/20a-brush-tool.test.tsx:100`, `src/test/20a-brush-tool.test.tsx:141`).

## Gaps / Mismatches
- None found for the intro workflow; full Adobe brush libraries are not required for the browser target.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
