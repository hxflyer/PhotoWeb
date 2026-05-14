# 029 resize-selections-with-transform-selection
- Lesson path: `doc/photoshop-essentials-basics/resize-selections-with-transform-selection/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 11b-transform-selection

## Lesson Expectations
- Select > Transform Selection transforms the selection outline only, with handles for scale, move, rotate, linked/unlinked W/H, Skew, Distort, Perspective, Warp, Enter commit, and Esc cancel.
- Screenshots include `2022-transform-selection-photoshop-transform-selection-command-c66c0243.png`, `2022-transform-selection-drag-handle-to-resize-selection-outline-ca85782b.jpg`, and `2022-transform-selection-width-height-link-icon-91ea3a06.png`.

## Photoweb Coverage
- Context menu exposes Transform Selection on active selection (`src/test/11b-transform-selection.test.tsx:84`).
- Overlay implements eight handles, move, rotate, linked W/H controls, Enter commit, and Esc cancel (`src/components/Canvas/TransformSelectionOverlay.tsx:2`, `src/components/Canvas/TransformSelectionOverlay.tsx:23`, `src/components/Canvas/TransformSelectionOverlay.tsx:286`, `src/test/11b-transform-selection.test.tsx:91`, `src/test/11b-transform-selection.test.tsx:128`).
- Shift unlocks linked aspect ratio while dragging, matching modern Photoshop transform defaults (`src/test/11b-transform-selection.test.tsx:104`).

## Gaps / Mismatches
- Skew, Distort, Perspective, and Warp modes from the lesson were not found in Transform Selection (`src/components/Canvas/TransformSelectionOverlay.tsx:2` describes only scale/rotate).

## Scope Decision
Fix

## Recommended Follow-up
Add Transform Selection context modes for Skew/Distort/Perspective/Warp, or record a deliberate divergence if only scale/rotate is intended.
