# 20b Brush Presets Plan

## Goals

### Feature: Define Brush Preset From Canvas

**What it does** — `Edit > Define Brush Preset...` opens a Photoshop-style New Brush dialog and saves the active layer's grayscale artwork as a custom brush tip. Dark pixels become opaque brush marks, white pixels become transparent, and gray pixels produce partial opacity.

**Photoshop habit preserved** — The menu path and naming dialog match `make-brushes`, grounded by `photoshop-brushes-make-brush-photoshop-define-brush-preset-d1666f5a.gif` and `photoshop-brushes-make-brush-photoshop-brush-name-b772448c.gif`.

**Invocation** — `Edit > Define Brush Preset...`.

**Pre-conditions** — A document and active raster layer must exist. Empty/all-white artwork is allowed but produces a transparent brush, matching Photoshop's grayscale rule.

**Interaction choreography** — User chooses the menu item, sees a modal titled `New Brush Preset`, enters a name, clicks `OK`, and the new preset appears at the bottom of the selected Brushes group. `Esc` or `Cancel` closes without saving.

**Visual feedback** — The dialog shows a brush tip preview; the Brushes panel row shows a thumbnail of the captured tip.

**Post-conditions** — A preset is added to the brush library and selected/applied. No document pixels are mutated and no history step is created.

**Edge cases** — If no layer exists, the command is disabled by doing nothing. Captured tips are clamped to Photoshop's documented 2500 px limit by downscaling.

### Feature: Save Brush Presets With Capture Flags

**What it does** — The Brushes panel's new-brush button opens the same New Brush dialog with `Capture Brush Size in Preset`, `Include Tool Settings`, and `Include Color`. Captured presets restore only the data the user asked to include.

**Photoshop habit preserved** — The checkboxes match `save-custom-brush-presets-photoshop-cc2018`, grounded by `cc-save-custom-brush-presets-photoshop-brush-preset-save-toolsettings-color-fe63cfb3.png`.

**Invocation** — Brushes panel bottom `Create New Brush` button.

**Pre-conditions** — Brush settings exist; selected group decides where the preset is saved.

**Interaction choreography** — User selects a group, clicks the new-brush icon, names the preset, chooses capture checkboxes, and clicks `OK`. Selecting the preset later restores stored tip, size, tool settings, and/or color according to those flags.

**Visual feedback** — Saved rows show a tool-settings marker and a color swatch when those data were captured, matching Photoshop's thumbnail badges.

**Post-conditions** — Applying a preset updates the active Brush state and selects Brush.

**Edge cases** — If size was not captured, applying keeps the current size while still applying the tip. If color was not captured, applying keeps the current foreground color.

### Feature: Brushes Panel Groups And Get More Brushes

**What it does** — The Brushes panel displays folder groups, lets users create and select a custom group, and exposes an upper-right panel menu with `Get More Brushes...`.

**Photoshop habit preserved** — Group folders and panel-menu placement match `save-custom-brush-presets-photoshop-cc2018` and `get-more-brushes-photoshop-cc-2018`, grounded by `cc-save-custom-brush-presets-brushes-panel-create-new-group-8a070899.png` and `cc-get-more-brushes-get-more-brushes-photoshop-cc2018-d0994d43.png`.

**Invocation** — `Window > Brushes` / `F5`, bottom Create New Group icon, upper-right panel menu > `Get More Brushes...`.

**Pre-conditions** — None beyond the panel being visible.

**Interaction choreography** — User opens Brushes, clicks a folder to select it or disclosure to collapse it, clicks Create New Group to name a folder, clicks panel menu and chooses `Get More Brushes...` to open the Adobe brush page in a browser tab.

**Visual feedback** — Groups render as folder rows; active group and active preset have selected row styling. `Get More Brushes...` reports via toast if popup opening is blocked.

**Post-conditions** — New presets save into the selected group. `Get More Brushes...` does not mutate the document.

**Edge cases** — Existing legacy flat presets are shown under `General Brushes`; popup blockers are handled with a toast.

## Out-Of-Scope This Tick

- Full Kyle T. Webster catalog, Creative Cloud sign-in, and `.abr` parsing / native install.
- Brush dynamics beyond storing current smoothing / spacing and the existing mode / opacity / flow controls.
- Full Photoshop Brush Preset Picker parity in the 20a right-click compact picker.

## Files To Edit / Files To Create

- Preset model and persistence: `src/store/types.ts`, `src/store/toolsSlice.ts`.
- Brush tip painting: `src/utils/brushEngine.ts`, `src/components/Canvas/Viewport.tsx`.
- Dialog and panel UI: `src/components/Dialogs/NewBrushPresetDialog.tsx`, `src/components/Panels/BrushPresetsPanel.tsx`.
- Menu and app events: `src/components/layout/MenuBar.tsx`, `src/App.tsx`.
- Tests: new focused 20b test plus updates to existing preset tests.

## Test Cases

- `Edit > Define Brush Preset...` saves a grayscale custom tip and applying it paints only dark / gray source pixels.
- New Brush dialog capture flags persist and applying a preset restores captured tool settings and color.
- Brush panel group creation saves a preset into the selected group.
- Brush panel menu `Get More Brushes...` calls `window.open` and emits a toast.
- Existing flat preset behavior still applies, renames, duplicates, and reorders.

## Divergences From Photoshop

- Photoshop downloads and installs `.abr` files through Adobe / OS file handling; photoweb opens Adobe's brush page and does not parse `.abr` because Creative Cloud and native file associations are out of browser scope.
- Photoshop's complete brush dynamics are extensive; photoweb stores/applies current basic tool settings here because full dynamics are scheduled for `21-brush-dynamics`.

## Stop Conditions Specific To This Cluster

- Stop if custom-tip painting requires replacing the entire Viewport paint path.
- Stop if group support would require changing more than 40 files.
- Stop if existing preset persistence cannot be migrated without preserving old flat presets.
