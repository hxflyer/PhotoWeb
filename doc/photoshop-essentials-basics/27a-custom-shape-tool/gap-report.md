# 27a Custom Shape Tool Gap Report

Cluster: `27a-custom-shape-tool`

## Lessons Reviewed

- `how-to-draw-custom-shapes-in-photoshop` - Custom Shape Tool, Shapes panel, loading missing shapes, and dragging Shapes panel thumbnails into the document.
- `custom-shape-tool` - legacy Custom Shape Tool picker, fill/stroke choices, constrained dragging, and separate Shape layers.
- `how-to-use-the-custom-shape-tool-in-photoshop-cs6` - picker gear menu, loading/resetting shape sets, and selecting a thumbnail before drawing.
- `drawing-custom-shapes-with-the-shapes-panel-in-photoshop-cc-2020` - modern Shapes panel groups and drag-to-document workflow.

## Current Photoweb Coverage

- Custom Shape Tool already created `kind: 'custom'` Shape layers from a built-in SVG-path preset.
- The Options Bar already had a horizontal preset picker and custom shape thumbnails.
- Custom Shape Path mode was added in 25b, including SVG path conversion for type-in-shape workflows.
- Shape layers already preserve fill, stroke, and transform behavior from the broader shape system.

## Gaps

- Custom shapes were stored as a flat list, with no Photoshop-style shape sets.
- The Options Bar picker had no gear/menu affordance for loading default sets.
- There was no docked Shapes panel with collapsible groups.
- Canvas drops only handled files, so a Shapes panel thumbnail could not create a shape layer in the document.

## Implemented Work

- Grouped built-in custom shapes into Default Shapes, Arrows, Banners, and Animals sets while preserving the existing flat library API.
- Added more built-in preset paths for arrows, banners, a badge, and simple animal-themed shapes.
- Added a Custom Shape picker menu in the Options Bar that filters/loads shape sets and selects the first shape from the chosen set.
- Added a docked `ShapesPanel` with collapsible groups, selectable thumbnails, draggable shape payloads, and double-click center-add behavior.
- Added `Window > Shapes`, panel visibility persistence, and Right Panel Dock integration.
- Added canvas drop handling for `application/x-photoweb-custom-shape` payloads.
- Added an undoable helper for creating a custom Shape layer from a preset id at a target document position.

## Verification

- Focused:
  - `npx tsc -b`
  - `npx vitest run src/test/27a-custom-shape-tool.test.tsx src/test/presetsPanels.test.tsx src/test/26b-geometric-shapes.test.tsx src/test/01c-panels.test.tsx src/test/windowMenu.test.ts` - 5 files / 33 tests passed.
- Full:
  - `npx tsc -b`
  - `npm run lint` - 16 existing warnings, 0 errors.
  - `npm test` - 173 files / 1279 tests passed.
  - Dev server smoke: `curl -I http://127.0.0.1:5173/` returned `200 OK`.

## Photoshop Divergences Worth Keeping

- Built-in shape sets are compact Photoweb-native groups rather than Adobe's full installed custom shape libraries.
- Shapes panel drops create a new Shape layer using current Custom Shape Tool fill/stroke options at the drop point; Photoshop's deeper target-sensitive fill/stroke and layer-order rules are deferred.
