# 236 custom-shape-sets
- Lesson path: `doc/photoshop-essentials-basics/custom-shape-sets/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `27b-custom-shape-presets`

## Lesson Expectations
- Preset Manager switches Preset Type to Custom Shapes, selects shapes, saves a set, resets shapes, and loads a saved set.
- Shape picker menu can replace/append sets.
- UI screenshots: `custom-shape-sets-photoshop-preset-manager-a1854b09.gif`, `custom-shape-sets-select-save-set-9db55f42.gif`, `custom-shape-sets-load-shapes-9406a408.gif`.

## Photoweb Coverage
- Custom shape library/groups and user custom shapes are implemented (`src/tools/customShapes.ts:201`, `src/components/Panels/ShapesPanel.tsx:15-29`).
- Save/load custom shape set actions exist as Photoweb JSON through menu commands (`src/components/layout/MenuBar.tsx:276-289`) and helper functions (`src/tools/customShapePresets.ts:104-118`).
- Tests cover exporting/importing custom shape sets (`src/test/27b-custom-shape-presets.test.tsx:79-97`).

## Gaps / Mismatches
- Photoweb does not implement Photoshop’s Preset Manager UI; set save/load is JSON prompt/menu based.
- No `.csh` compatibility, replace/append dialog, or thumbnail-size Preset Manager controls.

## Scope Decision
Fix.

## Recommended Follow-up
Decide whether to build a small Custom Shapes manager panel/dialog or record JSON-based set exchange as an accepted browser/product divergence.
