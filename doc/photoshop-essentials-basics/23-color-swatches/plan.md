# 23 Color Swatches Plan

## Goals

### Feature: Eyedropper Sample Options

**What it does** — Eyedropper Options Bar controls choose point/average sample size and current-layer/all-layers source.

**Photoshop habit preserved** — The lesson calls out Eyedropper Tool `I` and the Options Bar `Sample Size` choices.

**Invocation** — Select Eyedropper, change `Sample Size` or `Sample` in the Options Bar, click the canvas.

**Post-conditions** — Normal click sets Foreground; Alt/Option-click sets Background.

### Feature: Grouped Swatches Panel

**What it does** — Swatches are organized into folder-style groups with disclosure arrows, selected group state, new-group/new-swatch/delete actions, and browser persistence.

**Photoshop habit preserved** — Photoshop CC 2020 Swatches panel represents sets as folders and lets users twirl groups open/closed.

**Invocation** — Open Swatches panel, create/select a group, click Create New Swatch after sampling a foreground color.

**Post-conditions** — New swatches land in the selected group and remain available after reload.

### Feature: Foreground / Background Swatch Selection

**What it does** — Clicking a swatch sets Foreground; Ctrl/Cmd-click sets Background.

**Photoshop habit preserved** — The classic custom-swatches lesson teaches Ctrl/Cmd-click for Background color.

**Invocation** — Click or Cmd/Ctrl-click any visible swatch.

**Post-conditions** — `primaryColor` or `secondaryColor` updates.

### Feature: Mosaic Prep Filter

**What it does** — `Filter > Pixelate > Mosaic…` averages pixels into square cells so image palettes are easier to sample.

**Photoshop habit preserved** — The CC 2020 image-swatches lesson prepares photos with Mosaic before sampling colors.

**Invocation** — Choose Filter > Pixelate > Mosaic, adjust Cell Size, click OK.

**Post-conditions** — The active layer is destructively pixelated through the existing filter pipeline.

## Files Edited / Created

- `src/tools/eyedropper.ts` — existing options consumed by the wired Options Bar.
- `src/components/Panels/OptionsBar.tsx` — Eyedropper sample controls.
- `src/store/colorSlice.ts` and `src/store/types.ts` — grouped swatch state and actions.
- `src/components/Panels/SwatchesPanel.tsx` — Photoshop-style grouped panel UI.
- `src/filters/pixelateFilters.tsx`, `src/filters/index.ts`, `src/components/layout/MenuBar.tsx` — Mosaic filter registration and menu entry.
- `src/test/23-color-swatches.test.tsx` — focused regressions.

## Test Cases

- Options Bar changes Eyedropper sample size/source.
- Eyedropper average sampling updates Foreground; Alt/Option sampling updates Background.
- Swatches panel click updates Foreground and Cmd/Ctrl-click updates Background.
- Cmd/Ctrl-clicking a group arrow collapses all groups.
- Mosaic filter averages each cell.

## Divergences From Photoshop

- Browser persistence replaces Photoshop swatch files for this tick.
- Full drag/drop swatch application onto pixel, shape, and type layer contents remains a later fill-layer/layer-effects workflow.
