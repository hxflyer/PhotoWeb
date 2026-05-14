# 202 transform-selection
- Lesson path: `doc/photoshop-essentials-basics/transform-selection/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `11b-transform-selection`

## Lesson Expectations
- Select > Transform Selection or right-click active selection transforms only the marching ants, not pixels (`2022-transform-selection-photoshop-transform-selection-command-c66c0243.png`).
- Handles resize/reshape, inside drag moves, outside corner rotates; Shift unlocks or constrains depending Photoshop version; Shift rotation snaps 15 degrees.
- Options Bar shows X/Y/W/H/angle controls; Enter commits, Esc cancels.

## Photoweb Coverage
- Transform Selection overlay exists in `src/components/Canvas/TransformSelectionOverlay.tsx:365`.
- App mounts it when `isTransformSelectionOpen` is true in `src/App.tsx:1270`.
- Tests cover right-click menu access in `src/test/11b-transform-selection.test.tsx:83`.

## Gaps / Mismatches
- Test evidence for handle resize, rotate, Shift 15-degree snap, and Options Bar numeric readouts is thin in this slice.
- The Photoshop CC 2022 lesson says Shift unlocks aspect ratio, which can conflict with older transform conventions.

## Scope Decision
Fix.

## Recommended Follow-up
Expand Transform Selection tests for resize/move/rotate/Enter/Esc and decide the Shift behavior version target explicitly.
