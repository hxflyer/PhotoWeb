# 052 transform-and-warp-images-with-free-transform-in-photoshop-cc-2019
- Lesson path: `doc/photoshop-essentials-basics/transform-and-warp-images-with-free-transform-in-photoshop-cc-2019/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 19a-free-transform

## Lesson Expectations
- Edit > Free Transform (`Ctrl/Cmd+T`) transforms unlocked pixel/type/shape layers; Background layer must be unlocked first.
- Drag handles to scale, Shift constrains or unlocks depending Photoshop version, Alt/Option scales from center, drag outside to rotate, Shift rotates in 15-degree increments.
- Right-click inside transform box switches Skew, Distort, Perspective, Warp, Rotate, Flip; Enter commits and Esc cancels.
- Screenshots grounding UI: `2020-free-transform-free-transform-handles-photoshop-d32279f4.jpg`, `2020-free-transform-rotate-image-photoshop-45872dd6.jpg`, `2020-free-transform-skew-mode-photoshop-f4fa7f38.jpg`, `2020-free-transform-perspective-mode-photoshop-e97f40a2.jpg`.

## Photoweb Coverage
- Menu exposes Free Transform with `⌘T` in `src/components/layout/MenuBar.tsx:247`.
- Overlay supports stable modifier modes for distort/skew/perspective in `src/components/Canvas/FreeTransformOverlay.tsx:117`.
- Shift aspect constraint, Alt center scaling, rotation, and 15-degree snapping are handled in `src/components/Canvas/FreeTransformOverlay.tsx:236`, `src/components/Canvas/FreeTransformOverlay.tsx:261`, and `src/components/Canvas/FreeTransformOverlay.tsx:344`.
- Enter/Esc commit/cancel are handled in `src/components/Canvas/FreeTransformOverlay.tsx:455`.
- Tests cover locked-layer refusal and undoable commit in `src/test/19a-free-transform.test.tsx:32`.

## Gaps / Mismatches
- Transform sub-menu entries Scale/Rotate/Skew/Distort/Perspective are present but disabled in `src/components/layout/MenuBar.tsx:248`; Photoshop can invoke these modes from menus/context.
- Free Transform keeps legacy Shift-constrain behavior, diverging from the lesson's CC 2019+ summary.
- Smart Object guidance is out of scope.

## Scope Decision
Fix

## Recommended Follow-up
Wire transform mode invocation from context/menu items or document the limitation; confirm the Shift behavior divergence is intentional and logged.

