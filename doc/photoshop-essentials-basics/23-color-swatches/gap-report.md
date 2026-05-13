# 23 Color Swatches Gap Report

Cluster: `23-color-swatches`

## Lessons Reviewed

- `create-color-swatches-from-images-in-photoshop-cc-2020` — prepare an image with Filter > Pixelate > Mosaic, sample colors with Eyedropper, create swatch groups, add/delete swatches, and keep sampled image palettes organized.
- `drag-and-drop-colors-swatches-in-photoshop-cc-2020` — Swatches panel uses folder-style groups, disclosure arrows, recent/default sets, and direct color reuse.
- `custom-swatches` — swatch palettes can be cleared, rebuilt from image samples, saved/reloaded, and clicked for foreground or Ctrl/Cmd-clicked for background.

## Current Photoweb Coverage

- Eyedropper Tool already sampled from current layer or all layers, supported point/average sample sizes, and used Alt/Option to target the background color in [eyedropper.ts](../../../src/tools/eyedropper.ts#L1).
- Toolbar and shortcut registration already exposed the Eyedropper Tool through `I`.
- Swatches panel existed as a flat browser-persisted grid with add, click-to-foreground, and right-click delete.
- Filter infrastructure already supported modal destructive filters and Filter menu submenus.

## Gaps

- Eyedropper sample size/source controls were visually present in the Options Bar but were not wired to the tool.
- Swatches were a flat array rather than Photoshop-style folder/group sets with disclosure arrows.
- Ctrl/Cmd-click swatch selection for Background color was missing.
- Ctrl/Cmd-click disclosure arrows did not open/close all swatch groups.
- The image-to-swatches workflow had no Filter > Pixelate > Mosaic prep step.

## Implemented Work

- Wired Eyedropper Options Bar `Sample Size` and `Sample` controls to `getEyedropperOptions` / `setEyedropperOptions`.
- Extended the color store with `swatchGroups`, selected group state, group create/select/toggle/rename actions, and backward-compatible flat `swatches` persistence.
- Rebuilt Swatches panel around group rows, disclosure arrows, Create New Group, Create New Swatch, Delete Swatch, foreground/background swatches, draggable swatches, and a color drop target.
- Added Ctrl/Cmd-click on swatches to set `secondaryColor`; regular click sets `primaryColor`.
- Added Ctrl/Cmd-click on a group arrow to collapse/expand all groups.
- Added `Filter > Pixelate > Mosaic…` with a Cell Size control and deterministic cell-color averaging.

## Verification

- Focused:
  - `npx tsc -b`
  - `npx vitest run src/test/23-color-swatches.test.tsx`
- Full:
  - `npx tsc -b`
  - `npm run lint` — 16 existing warnings, 0 errors.
  - `npm test` — 167 files / 1255 tests.
  - Dev server smoke test: `curl -I http://127.0.0.1:5173/` returned `200 OK`.

## Photoshop Divergences Worth Keeping

- Photoweb supports dropping a hex color payload into the Swatches panel and dragging swatches as color payloads, but it does not yet implement Photoshop's full swatch-to-layer drop behavior that creates clipped/non-clipped fill layers or Color Overlay effects depending on layer type and modifier keys.
- Swatch sets persist in browser storage rather than Photoshop `.aco` / `.ase` files.
