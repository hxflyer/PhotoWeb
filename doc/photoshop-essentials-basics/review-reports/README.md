# Photoshop Essentials Basics Lesson Review Reports

This directory contains one review report for every lesson in
`doc/photoshop-essentials-basics/lessons.json`.

## Coverage

- Total lesson reports: 242
- In-scope lessons in `lessons.json`: 153
- Out-of-scope lessons in `lessons.json`: 89
- Report naming: `<NNN>-<slug>.md`, where `NNN` is the 1-based lesson index.

## Review Slices

- `001`-`041` - overview, interface, navigation, file/open/place, crop, selections, masks, gradients, shapes, exclusions.
- `042`-`082` - default editor/install exclusions, crop, properties, selections, gradients, swatches, layer styles, brush, open/new/save.
- `083`-`123` - image size, blend modes, smart-object exclusions, brush presets, document transfer, navigation extras, panels/preferences.
- `124`-`164` - Bridge/Camera Raw exclusions, close/canvas/rotate/layers/type/gradient/shape/focus-area/navigation.
- `165`-`205` - navigation, panels, clipping masks, type, selections, vector/path/shape, layers, patterns, document transfer.
- `206`-`242` - Bridge/action/custom-shortcut exclusions, brush dynamics, lasso/marquee, styles, custom shapes/swatches, masks, preferences.

## Recurring Follow-Up Themes

- Modifier-key fidelity needs focused end-to-end tests across crop, transform, zoom, selections, shapes, type boxes, and document transfer.
- Gradient and pattern workflows work, but Gradients panel/grouping/drag-to-apply and some editor edge cases need stronger parity.
- Brush workflows need richer Photoshop-style cursor, temporary Clear/tilde behavior, preset capture, group/panel, and preview integration.
- Layer masks are broad but still need a precise thumbnail-modifier matrix review.
- Type and shape interoperability remains the largest functional mismatch: editable vector boolean operations, converted text anchors, type-on-path handles, and typography controls.
- Many lessons are deliberately out of scope by product target: Adobe ecosystem, Camera Raw/Bridge/Lightroom, generative AI, Smart Objects/Smart Filters, Actions, metadata, print/prepress, workspaces/custom shortcuts, Frame Tool, nav extras, color management, and multi-document UI.

## Audit

Generated in parallel and audited for:

- exactly one report for each lesson index `001` through `242`;
- no duplicate numeric prefixes;
- required sections present in every report:
  - `Lesson Expectations`
  - `Photoweb Coverage`
  - `Gaps / Mismatches`
  - `Scope Decision`
  - `Recommended Follow-up`
