# 065 photoshop-brush-tool-hidden-tips-tricks
- Lesson path: `doc/photoshop-essentials-basics/photoshop-brush-tool-hidden-tips-tricks/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 20a-brush-tool

## Lesson Expectations
- Press `B` for Brush Tool; enable `Show Crosshair in Brush Tip` in Preferences > Cursors; Caps Lock toggles precise cursor.
- Lower Brush Settings Spacing to smooth strokes; bracket keys resize brush, Shift+brackets adjust hardness.
- Screenshots grounding UI: `cc-brush-tool-tips-show-crosshair-in-brush-tip-5024ca95.png`, `cc-brush-tool-tips-default-brush-stroke-photoshop-7a8a0f4a.png`, `cc-brush-tool-tips-photoshop-brush-spacing-option-7cdc1788.png`, `cc-brush-tool-tips-bracket-keys-change-brush-size-5f6282b5.png`.

## Photoweb Coverage
- Keyboard tool groups map `B` to Brush/Pencil in `src/App.tsx:713`.
- Brush options include spacing and smoothing in `src/tools/brush.ts:6`.
- Brackets adjust size and Shift+brackets adjust hardness in `src/App.tsx:782`.
- Tests cover bracket/hardness shortcuts, precise cursor/Caps Lock, and right-click brush picker in `src/test/20a-brush-tool.test.tsx:52`.

## Gaps / Mismatches
- Preferences > Cursors `Show Crosshair in Brush Tip` was not found; precise cursor is Caps Lock driven.
- Full Brush Settings panel spacing UI may live in brush dynamics/presets, but the inspected basic brush Options Bar did not show a Photoshop-style spacing control.
- Brush cursor polish remains a recurring muscle-memory area.

## Scope Decision
Fix

## Recommended Follow-up
Add/verify a cursor preference for crosshair-in-brush-tip and make brush spacing discoverable from Brush Settings.

