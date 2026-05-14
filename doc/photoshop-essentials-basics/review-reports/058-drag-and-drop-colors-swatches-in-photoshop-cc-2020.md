# 058 drag-and-drop-colors-swatches-in-photoshop-cc-2020
- Lesson path: `doc/photoshop-essentials-basics/drag-and-drop-colors-swatches-in-photoshop-cc-2020/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 23-color-swatches

## Lesson Expectations
- Swatches panel groups are collapsible; Ctrl/Cmd-click arrow opens/closes all groups; panel menu changes thumbnail/list size.
- Drag swatch onto pixel layer to fill pixels, shape/type layer to change fill, canvas to create Solid Color fill layer, Alt/Option-drag to apply Color Overlay layer effect.
- Screenshots grounding UI: `2020-swatches-panel-swatches-panel-photoshop-cc2020-b2dd5fdb.png`, `2020-swatches-panel-drag-swatch-onto-pixel-layer-d28de456.jpg`, `2020-swatches-panel-color-fill-layer-created-photoshop-297cc7f5.png`, `2020-swatches-panel-drag-with-alt-option-key-2278209d.jpg`.

## Photoweb Coverage
- Swatches panel provides grouped swatches and Ctrl/Cmd-click all-collapse via `toggleSwatchGroup(group.id, event.metaKey || event.ctrlKey)` in `src/components/Panels/SwatchesPanel.tsx:120`.
- Swatch chips are draggable and put color data on `application/x-photoweb-color` in `src/components/Panels/SwatchesPanel.tsx:155`.
- Panel drop target adds colors to the active group in `src/components/Panels/SwatchesPanel.tsx:42`.
- Tests cover grouped swatches and Cmd/Ctrl-click collapse in `src/test/23-color-swatches.test.tsx:84`.

## Gaps / Mismatches
- Dragging swatches onto layers/canvas to fill layer contents or create Solid Color fill layers was not found in inspected code.
- Alt/Option-drag to create Color Overlay layer effect is not implemented.
- Panel thumbnail/list size options are absent.

## Scope Decision
Fix

## Recommended Follow-up
Add canvas/layer drop handling for swatch colors and an Alt/Option Color Overlay path, or mark that drag-to-apply is deferred.

