# 180 photoshop-type-essentials
- Lesson path: `doc/photoshop-essentials-basics/photoshop-type-essentials/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `24-type-basics`

## Lesson Expectations
- T selects Type Tool; I-beam cursor appears (`type-essentials-i-beam-f4289fe2.gif`).
- Options Bar controls font family, style, size, color; font list previews typefaces (`type-essentials-font-list-47d5875c.gif`, `type-essentials-font-samples-47ee547e.gif`).
- Click to type, move text while typing, checkmark commits, Esc/cancel deletes or cancels new type, Enter inserts line breaks.

## Photoweb Coverage
- Tool shortcut group maps `t` to horizontal/vertical type in `src/App.tsx:720`.
- Type tool creates and re-edits type layers in `src/tools/type.ts:520`.
- Font picker component exists in `src/components/Panels/FontPicker.tsx`.
- Tests cover point/area creation and type option edits in `src/test/24-type-basics.test.tsx:77`.

## Gaps / Mismatches
- Font preview size preference from the lesson is not evident; Preferences General currently notes interpolation is not implemented there (`src/components/Dialogs/PreferencesDialog.tsx:154`).
- "Move text as you're typing" and exact checkmark/cancel behavior should be checked in the overlay tests.

## Scope Decision
Fix.

## Recommended Follow-up
Add coverage for moving active type during edit and decide whether font preview size belongs in scope.
