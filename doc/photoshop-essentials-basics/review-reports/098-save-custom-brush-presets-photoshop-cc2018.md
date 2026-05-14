# 098 save-custom-brush-presets-photoshop-cc2018
- Lesson path: `doc/photoshop-essentials-basics/save-custom-brush-presets-photoshop-cc2018/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `20b-brush-presets`

## Lesson Expectations
- Configure Brush Tool options, Brush Settings, and foreground color, then Window > Brushes, create a group, click Create New Brush, name it, and choose whether to include Tool Settings and Color (`cc-save-custom-brush-presets-photoshop-brush-preset-save-toolsettings-color-fe63cfb3.png`).
- Presets appear in selected folders with thumbnail previews (`cc-save-custom-brush-presets-custom-brush-preset-saved-photoshopcc2018-8b36fa20.png`).

## Photoweb Coverage
- Brushes panel supports groups, thumbnails, selected group save, New Brush Preset dialog, and restore of captured settings/color (`src/components/Panels/BrushPresetsPanel.tsx:45`, `src/components/Dialogs/NewBrushPresetDialog.tsx:118`, `src/test/20b-brush-presets.test.tsx:114`).
- Tests cover group creation, save, and panel rendering (`src/test/20b-brush-presets.test.tsx:147`, `src/test/presetsPanels.test.tsx:75`).

## Gaps / Mismatches
- No `.abr` export/import parity; acceptable as proprietary format divergence.
- Otherwise no major lesson mismatch found.

## Scope Decision
Divergence already accepted.

## Recommended Follow-up
No action.
