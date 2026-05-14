# 153 how-to-use-the-gradient-editor-in-photoshop
- Lesson path: `doc/photoshop-essentials-basics/how-to-use-the-gradient-editor-in-photoshop/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `22a-gradient-tool-and-editor`

## Lesson Expectations
- Opens the Gradient Editor from the gradient preview and selects presets.
- Edits color stops, opacity stops, locations, midpoints, smoothness, and custom gradient names.
- Adds stops by clicking above/below the ramp, deletes stops by dragging away or Delete, duplicates/moves stops, and saves presets.
- Photoshop UI includes preset thumbnails, stop markers, midpoint diamonds, color picker launches, and OK/Cancel behavior.

## Photoweb Coverage
- `src/tools/gradient.ts:36` defines default presets and `src/tools/gradient.ts:156` resolves stops.
- `src/tools/gradient.ts:215` samples stops with smoothness and midpoints; `src/tools/gradient.ts:289` merges opacity stops.
- `src/components/Dialogs/GradientEditorDialog.tsx:154` manages editor state and presets; `src/components/Dialogs/GradientEditorDialog.tsx:213` adds stops; `src/components/Dialogs/GradientEditorDialog.tsx:232` drags stops and midpoints.
- `src/components/Dialogs/GradientEditorDialog.tsx:292` confirms/saves presets, and `src/components/Dialogs/GradientEditorDialog.tsx:520` renders selected stop controls.
- `src/test/gradientEditor.test.tsx:47` and `src/test/gradientOptions.test.ts:84` cover editor and custom stop behavior.

## Gaps / Mismatches
- Some Photoshop polish is unclear or missing: drag-away deletion, stop duplication shortcuts, preset-management menu behavior, and exact color-picker workflows.
- The editor appears functional, but edge-case UI behavior needs fuller interaction tests.

## Scope Decision
Fix

## Recommended Follow-up
Add interaction tests for deleting stops, duplicate/move behavior, preset saving/renaming, opacity-stop edits, midpoint edits, and cancel-vs-OK persistence.
