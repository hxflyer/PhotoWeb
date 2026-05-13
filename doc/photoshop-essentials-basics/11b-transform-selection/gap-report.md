# Gap Report — 11b Transform Selection

## Lessons reviewed
- `transform-selection` — Transform Selection resizes, moves, rotates, skews, distorts, perspectives, and warps the selection outline without changing selected pixels; invoked from `Select > Transform Selection` or right-click inside the selection.
- `resize-selections-with-transform-selection` — duplicate copy of the same lesson path with the full workflow: initial marquee, Transform Selection, linked W/H fields, Shift unlock, move/rotate, checkmark commit, cancel, undo, and later mask/background steps.

Key UI images inspected:
- `transform-selection/images/2022-transform-selection-photoshop-transform-selection-command-c66c0243.png` — Select menu command location.
- `transform-selection/images/2022-transform-selection-choose-transform-selection-from-menu-13073bf0.jpg` — right-click context menu entry inside the selection outline.
- `transform-selection/images/2022-transform-selection-width-height-link-icon-91ea3a06.png` — Options Bar W/H readouts and active link icon.
- `transform-selection/images/2022-transform-selection-transform-selection-checkmark-6a8c1a3d.png` — Options Bar checkmark commit affordance.
- `transform-selection/images/2022-transform-selection-drag-handle-to-resize-selection-outline-ca85782b.jpg` — resize handles affect the outline, not pixels.

## Current photoweb coverage
- `Select > Transform Selection` was already wired to an overlay flag: [MenuBar.tsx](src/components/layout/MenuBar.tsx#L559), [panelsSlice.ts](src/store/panelsSlice.ts#L144).
- `TransformSelectionOverlay` already rendered a transform box/handles and committed a transformed raster mask without changing layer pixels: [TransformSelectionOverlay.tsx](src/components/Canvas/TransformSelectionOverlay.tsx#L202).
- The app mounted the overlay while `isTransformSelectionOpen` is true: [App.tsx](src/App.tsx#L1125).
- Existing tests covered the store flag and a manual mask-scale path: [selectionWorkflowBatch5.test.tsx](src/test/selectionWorkflowBatch5.test.tsx#L200).

## Gaps
- Right-clicking inside an active selection did not offer `Transform Selection`; the context menu only exposed the pixel-transform path.
- The Select menu command was always enabled instead of being disabled/no-op when no selection existed.
- Handle resizing was freeform by default, but the lesson shows linked W/H as active by default and uses `Shift` to unlock aspect ratio.
- `Alt/Option` resize-from-center and `Shift` rotation snapping were missing from the overlay choreography.
- The overlay had only a small floating label with text `Commit` / `Cancel`; it did not expose X/Y/W/H readouts or a link toggle matching the Options Bar.

## Photoshop-habit mismatches
- The lesson explicitly offers `Select > Transform Selection` and right-click `Transform Selection`; photoweb only had the menu path.
- `2022-transform-selection-width-height-link-icon-91ea3a06.png` shows linked W/H fields active by default; photoweb did not link handle or numeric resizing.
- `2022-transform-selection-transform-selection-checkmark-6a8c1a3d.png` shows icon-first check/cancel controls in the Options Bar; photoweb used labeled buttons in a corner panel.
- Photoshop rotates in 15 degree increments with `Shift`; photoweb rotated continuously.

## UI / UX issues
- No readouts meant the user could not inspect or enter the selection bounds numerically.
- The overlay controls floated over the document instead of behaving like a top Options Bar strip.

## Photoshop divergences worth keeping
- Full Skew, Distort, Perspective, and Warp submodes are deferred. They overlap the broader `19a-free-transform` and `19b-warp` clusters, and implementing them correctly requires a larger transform-mode surface than this selection-command tick.
