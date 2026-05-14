# 060 warp-images-with-the-enhanced-warp-tool-in-photoshop-cc-2020
- Lesson path: `doc/photoshop-essentials-basics/warp-images-with-the-enhanced-warp-tool-in-photoshop-cc-2020/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 19b-warp

## Lesson Expectations
- Edit > Transform > Warp or Free Transform Options Bar Warp icon.
- Default warp controls, presets, grid presets, custom grid, split lines, multi-point selection, moving/scaling/rotating selected warp points, reset, Enter/checkmark commit, Esc/cancel.
- Smart Object conversion for nondestructive editable warp is recommended in Photoshop but excluded in Photoweb.
- Screenshots grounding UI: `cc-warp-edit-transform-warp-b20ab3f6.png`, `cc-warp-warp-grid-option-photoshop-dc9b2c61.png`, `cc-warp-split-grid-crosswise-cc4c53d0.jpg`, `cc-warp-select-multiple-warp-grid-points-2b3a1619.jpg`.

## Photoweb Coverage
- Menu exposes Transform > Warp in `src/components/layout/MenuBar.tsx:255`.
- Warp overlay supports presets, grid modes, custom rows/columns, split buttons, reset, commit/cancel buttons in `src/components/Canvas/WarpOverlay.tsx:430`.
- Warp engine applies mesh warp through `src/core/imageTransforms.ts:308`.
- Multi-point selection box with move/scale/rotate handles is rendered in `src/components/Canvas/WarpOverlay.tsx:480`.
- Tests cover shortcut/open, grid presets/splits, commit history, cancel, locked layers, and Free Transform-to-Warp switch in `src/test/19b-warp.test.tsx:42`.

## Gaps / Mismatches
- Smart Object nondestructive warp is excluded; Photoweb warp is destructive with undo history.
- UI differs from Photoshop's exact Options Bar placement; overlay has a compact floating control strip.
- Need confirm whether Enter/Esc keyboard handling exists for Warp beyond buttons; tests mention commit/cancel flows but inspected snippet shows buttons.

## Scope Decision
divergence already accepted

## Recommended Follow-up
Add/verify Enter and Esc keyboard handling for Warp if absent.

