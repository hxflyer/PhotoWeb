# 050 how-to-create-a-rainbow-gradient-in-photoshop
- Lesson path: `doc/photoshop-essentials-basics/how-to-create-a-rainbow-gradient-in-photoshop/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 22a-gradient-tool-and-editor

## Lesson Expectations
- Open Gradients panel, create `My Gradients` group, select Gradient Tool, click Options Bar gradient swatch to open Gradient Editor.
- Edit color stops by selecting/adding stops, set colors via Color Picker, set locations evenly, name preset, click New to save.
- Apply saved rainbow gradient to image/shape/text.
- Screenshots grounding UI: `2020-rainbow-gradient-new-gradient-group-9d287ea3.png`, `2020-rainbow-gradient-gradient-editor-photoshop-25240c4a.png`, `2020-rainbow-gradient-change-gradient-stop-color-c4854f06.png`, `2020-rainbow-gradient-rainbow-gradient-preset-e09d95c1.png`.

## Photoweb Coverage
- Gradient Editor dialog exists at `src/components/Dialogs/GradientEditorDialog.tsx:344`.
- Gradient Tool supports custom Gradient Editor stops when drawing; tests cover stop rendering in `src/test/gradientOptions.test.ts:84`.
- Gradient Editor tests cover stop color picker wiring and midpoint/smoothness behavior in `src/test/gradientEditor.test.tsx:129`, `src/test/gradientMidpointBatchC.test.tsx:37`, and `src/test/gradientSmoothnessBatchC.test.tsx:30`.
- Gradient fill layers can be added from menus in `src/components/layout/MenuBar.tsx:398`.

## Gaps / Mismatches
- I did not find a dedicated Gradients panel file analogous to Swatches/Shapes in `src/components/Panels`; panel-level grouping and `New Gradient Group` may be absent or incomplete.
- Preset saving from the Gradient Editor may not match Photoshop's `New` button workflow in this lesson.
- Applying a saved custom gradient to shape/text from a panel thumbnail is not clearly covered in inspected refs.

## Scope Decision
Fix

## Recommended Follow-up
Audit gradient preset persistence and Gradients panel grouping; add a rainbow-preset simulator test if missing.

