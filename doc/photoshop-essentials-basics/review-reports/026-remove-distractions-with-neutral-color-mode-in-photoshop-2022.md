# 026 remove-distractions-with-neutral-color-mode-in-photoshop-2022
- Lesson path: `doc/photoshop-essentials-basics/remove-distractions-with-neutral-color-mode-in-photoshop-2022/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 01e-neutral-color-mode

## Lesson Expectations
- Preferences > Interface exposes Neutral Color Mode, flattening colorful Photoshop UI accents so image color judgment is less biased.
- Screenshots show the Interface preferences pane and the Neutral Color Mode checkbox.

## Photoweb Coverage
- Preferences opens with category rail including Interface (`src/components/Dialogs/PreferencesDialog.tsx:17`, `src/components/Dialogs/PreferencesDialog.tsx:76`).
- Neutral Color Mode checkbox is wired to store and persistence (`src/components/Dialogs/PreferencesDialog.tsx:190`, `src/store/viewSlice.ts:357`, `src/test/01e-neutral-color-mode.test.tsx:20`, `src/test/01e-neutral-color-mode.test.tsx:50`).
- App applies/removes neutralized CSS tokens when enabled (`src/App.tsx:171`, `src/App.tsx:188`).

## Gaps / Mismatches
- None found after checking Preferences UI, store persistence, and tests.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
