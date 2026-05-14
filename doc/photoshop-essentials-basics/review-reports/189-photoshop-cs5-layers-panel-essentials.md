# 189 photoshop-cs5-layers-panel-essentials
- Lesson path: `doc/photoshop-essentials-basics/photoshop-cs5-layers-panel-essentials/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `07a-layers-panel`

## Lesson Expectations
- Layers panel shows tab, row, name, thumbnail, active row, eye icon, lock icon, add/delete/copy controls, and Channels/Paths tabs (`layers-layers-panel-photoshop-layers-panel-13e46992.gif`, `layers-layers-panel-channels-paths-tabs-075c8769.gif`).
- Users can add, move, delete, copy, hide/show, rename layers.

## Photoweb Coverage
- Layers panel rows include thumbnails, active state, visibility, locks, names, groups, masks, effects, opacity/fill/blend controls in `src/components/Panels/LayersPanel.tsx:620`.
- Layer creation/duplication/reorder/visibility/rename are backed by `src/store/layersSlice.ts`.
- Tests for layer panel basics live in `src/test/07a-layers-panel.test.tsx`.

## Gaps / Mismatches
- CS5-specific row styling is not exact, but the Photoshop-fluent functional surface is present.
- No new gap found beyond background/delete and group edge cases covered in adjacent reports.

## Scope Decision
divergence already accepted.

## Recommended Follow-up
No action.
