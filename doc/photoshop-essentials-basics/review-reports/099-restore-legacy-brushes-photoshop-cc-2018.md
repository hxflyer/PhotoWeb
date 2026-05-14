# 099 restore-legacy-brushes-photoshop-cc-2018
- Lesson path: `doc/photoshop-essentials-basics/restore-legacy-brushes-photoshop-cc-2018/lesson.md`
- Scope status: `out_of_scope: legacy_ui`
- Cluster coverage: `none`

## Lesson Expectations
- Brushes panel menu or Brush Preset Picker gear menu > Legacy Brushes, confirm OK, then a Legacy Brushes folder appears (`cc-legacy-brushes-load-legacy-brush-set-photoshopcc2018-adcccb0a.png`).
- This restores old Photoshop brush libraries removed in CC 2018.

## Photoweb Coverage
- Brushes panel supports folders and built-in/custom presets (`src/components/Panels/BrushPresetsPanel.tsx:160`).
- No legacy Adobe brush library loading was found.

## Gaps / Mismatches
- Legacy UI restoration and Adobe brush libraries are excluded; `.abr`/preset-library parsing is not implemented.

## Scope Decision
Out of scope.

## Recommended Follow-up
No action.
