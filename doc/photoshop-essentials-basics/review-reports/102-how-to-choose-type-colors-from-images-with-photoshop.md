# 102 how-to-choose-type-colors-from-images-with-photoshop
- Lesson path: `doc/photoshop-essentials-basics/how-to-choose-type-colors-from-images-with-photoshop/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `24-type-basics`

## Lesson Expectations
- Type Tool color swatch opens Color Picker; cursor becomes Eyedropper over the image; clicking samples a pixel while the dialog remains open (`cc-type-color-from-image-photoshop-color-picker-bea46ea1.jpg`, `cc-type-color-from-image-sample-first-type-color-from-image-515504a0.jpg`).
- Highlight individual letters, sample separate colors, then click the Options Bar checkmark (`cc-type-color-from-image-highlight-single-letter-with-type-tool-9454c314.jpg`, `cc-type-color-from-image-click-type-tool-checkmark-a12be1ee.png`).

## Photoweb Coverage
- Type Options Bar color swatch opens Color Picker for target `type` (`src/test/24-type-basics.test.tsx:133`).
- Color Picker can sample from canvas before confirming (`src/components/Dialogs/ColorPickerDialog.tsx:206`, `src/test/24-type-basics.test.tsx:143`).
- Character panel also opens the type color picker (`src/components/Panels/CharacterPanel.tsx:191`).
- Text overlay supports style runs for partial text styling (`src/tools/type.ts:13`, `src/tools/type.ts:209`).

## Gaps / Mismatches
- The lesson's final Options Bar checkmark for committing type is not obviously represented as a visible checkmark control in the refs inspected.
- Need stronger coverage that highlighted single letters receive sampled colors through the live text editor, not only whole-layer type color.

## Scope Decision
Fix: per-character sampled type color is in scope.

## Recommended Follow-up
Add an integration test for selecting one character, sampling from the canvas via Color Picker, and committing type with the Photoshop checkmark affordance.
