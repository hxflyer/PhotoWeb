# 152 blending-photos-with-layer-masks-and-gradients-in-photoshop
- Lesson path: `doc/photoshop-essentials-basics/blending-photos-with-layer-masks-and-gradients-in-photoshop/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `17-layer-masks`

## Lesson Expectations
- Places two photos on separate layers, adds a layer mask to the top layer, selects the mask thumbnail, and uses a black-to-white linear gradient to blend.
- Relies on foreground/background colors, mask thumbnail targeting, gradient drag direction/length, swapping or reversing colors, and repeated gradient edits on a mask.
- Edge cases include painting on the image vs the mask, black hides/white reveals, and soft transitions from the gradient.

## Photoweb Coverage
- `src/components/Panels/LayersPanel.tsx:861` implements mask thumbnail interactions including modifier-click behaviors.
- `src/tools/gradient.ts:199` snaps gradient angles with Shift; `src/tools/gradient.ts:215` samples gradient stops, smoothness, opacity, and transparency.
- Gradient editor and options are covered by `src/components/Dialogs/GradientEditorDialog.tsx:154` and related gradient tests.

## Gaps / Mismatches
- This lesson depends on reliable gradient application to active layer masks; the reviewed refs show mask selection and gradient machinery, but not a direct end-to-end test for applying a gradient onto a layer mask to blend two images.
- Photoshop-habit risk: users may expect mask thumbnail targeting to be obvious and persistent during Gradient Tool use.

## Scope Decision
Fix

## Recommended Follow-up
Add an end-to-end layer-mask gradient blend test covering mask targeting, black-to-white reveal/hide semantics, Shift-constrained drag, and repeated gradient replacement.
