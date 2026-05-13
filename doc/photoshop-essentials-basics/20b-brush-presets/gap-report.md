# 20b Brush Presets Gap Report

Cluster: `20b-brush-presets`

## Lessons Reviewed

- `make-brushes` — create a grayscale brush tip from artwork with `Edit > Define Brush Preset`, then adjust Spacing / Shape Dynamics in the Brushes panel.
- `save-custom-brush-presets-photoshop-cc2018` — save brush presets from the Brushes panel, including brush size, tool settings, and color.
- `get-more-brushes-photoshop-cc-2018` — open `Window > Brushes`, use the panel menu, and choose `Get More Brushes`.

## Current Photoweb Coverage

- Brush preset storage already supports flat save / apply / remove / rename / reorder / duplicate in [toolsSlice.ts](../../../src/store/toolsSlice.ts).
- The current `BrushPreset` only stores round-brush settings plus optional smoothing / spacing in [types.ts](../../../src/store/types.ts).
- The Brushes surface exists as `Brush Presets` in [BrushPresetsPanel.tsx](../../../src/components/Panels/BrushPresetsPanel.tsx), with thumbnails, rename, delete, duplicate, drag reorder, and a new-preset dialog.
- `Window > Brush Presets` and `F5` are wired in [MenuBar.tsx](../../../src/components/layout/MenuBar.tsx) and [App.tsx](../../../src/App.tsx).
- `Edit > Define Brush Preset...` exists but uses `window.prompt` and snapshots current round settings instead of defining a tip from document pixels.
- The active Viewport paint path uses `applyBrushDab` in [brushEngine.ts](../../../src/utils/brushEngine.ts), which only stamps a generated circular dab.

## Gaps

- `Edit > Define Brush Preset...` must sample the active document/layer artwork as a grayscale brush tip: black opaque, white transparent, gray partial opacity.
- Presets need custom tip data and intrinsic dimensions so applying a defined brush changes the actual painted mark, not only Size / Hardness.
- The New Brush dialog must include Photoshop's capture options: `Capture Brush Size in Preset`, `Include Tool Settings`, and `Include Color`.
- Capture flags currently do not affect saved presets; the panel ignores `captureSize` / `captureColor`.
- Applying a preset cannot restore Brush Mode, Opacity, Flow, Smoothing, Spacing, or primary color when those were captured.
- The Brushes panel is flat; it does not show folders/groups or provide a Create New Group affordance.
- The Brushes panel has no upper-right panel menu and no `Get More Brushes...` command.

## Photoshop-Habit Mismatches

- `Edit > Define Brush Preset...` should open a naming dialog grounded by `photoshop-brushes-make-brush-photoshop-define-brush-preset-d1666f5a.gif` and `photoshop-brushes-make-brush-photoshop-brush-name-b772448c.gif`; a browser prompt is the wrong surface.
- Photoshop's Brushes panel shows folder groups and bottom icons for group / brush creation, grounded by `cc-save-custom-brush-presets-brushes-panel-create-new-group-8a070899.png` and `cc-save-custom-brush-presets-create-new-brush-preset-photoshopcc2018-15aa491c.png`; photoweb currently has one flat list and a text button.
- The New Brush dialog should expose `Include Tool Settings` and `Include Color`, grounded by `cc-save-custom-brush-presets-photoshop-brush-preset-save-toolsettings-color-fe63cfb3.png`.
- The Brushes panel menu icon must expose `Get More Brushes...`, grounded by `cc-get-more-brushes-photoshop-brushes-panel-menu-icon-42071671.png` and `cc-get-more-brushes-get-more-brushes-photoshop-cc2018-d0994d43.png`.

## UI / UX Issues

- Saved presets do not visually indicate captured tool settings or color swatches, while Photoshop shows a tool icon and color swatch on the preset row.
- Right-click Brush picker added in 20a remains compact Size / Hardness only; full preset picking belongs to the Brushes panel in this tick.

## Implemented Work

- Added serializable custom brush-tip data captured from active layer pixels using Photoshop's grayscale rule.
- Extended Brush presets with custom tips, capture-size flags, tool-setting capture, color capture, and group membership.
- Added default Brushes panel groups plus Create New Group and Create New Brush controls.
- Replaced `Edit > Define Brush Preset...` prompt with the New Brush Preset dialog and captured-tip preview.
- Added `Include Tool Settings` to the New Brush Preset dialog.
- Added preset thumbnail badges for included tool settings and included color.
- Taught the Viewport brush engine to stamp bitmap brush tips while preserving opacity, flow, selection mask, erase, and Multiply behavior.
- Added Brushes panel menu > `Get More Brushes...`, opening Adobe's brushes page with toast feedback.
- Renamed the visible panel/menu label from `Brush Presets` to Photoshop's `Brushes`.

## Verification

- `npx tsc -b`
- `npm run lint` — 16 existing warnings, 0 errors.
- Focused tests:
  - `src/test/20b-brush-presets.test.tsx`
  - `src/test/presetsPanels.test.tsx`
  - `src/test/presetDialogsBatchF.test.tsx`
  - `src/test/bugFixesBatch2.test.ts`
  - `src/test/20a-brush-tool.test.tsx`
  - `src/test/brushEngine.test.ts`
- Full suite: `npm test` — 164 files / 1234 tests.
- Dev server smoke test: `curl -I http://127.0.0.1:5173/` returned `200 OK`.

## Photoshop Divergences Worth Keeping

- `Get More Brushes...` will open Adobe's brush page in a new browser tab and show a toast; photoweb will not implement Creative Cloud authentication, the Adobe download catalog, or native `.abr` double-click installation.
- Brush dynamics such as Angle Control Direction and Pen Pressure are deferred to `21-brush-dynamics`.
