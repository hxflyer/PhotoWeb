# 215 make-brushes
- Lesson path: `doc/photoshop-essentials-basics/make-brushes/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `20b-brush-presets`

## Lesson Expectations
- Create a document, paint black source marks, choose `Edit > Define Brush Preset`, name the new brush, then edit spacing and dynamics in the Brushes panel.
- New brush appears in Brush Preset picker/panel and can be selected like built-ins.
- UI screenshots: `photoshop-brushes-make-brush-photoshop-define-brush-preset-d1666f5a.gif`, `photoshop-brushes-make-brush-brush-name-dialog-box-9d007481.gif`, `photoshop-brushes-make-brush-hair-brush-selected-ae74afdc.gif`.

## Photoweb Coverage
- `Edit > Define Brush Preset…` dispatches a brush preset event (`src/components/layout/MenuBar.tsx:265`).
- Brush Presets panel and New Brush Preset dialog save/apply presets (`src/components/Panels/BrushPresetsPanel.tsx:45`, `src/components/Panels/BrushPresetsPanel.tsx:518`, `src/components/Dialogs/NewBrushPresetDialog.tsx:118-198`).
- Presets persist and apply brush settings through `toolsSlice` (`src/store/toolsSlice.ts:203-260`).
- Tests cover brush preset creation, grouping, applying, and dialog wiring (`src/test/20b-brush-presets.test.tsx`, `src/test/presetDialogsBatchF.test.tsx`).

## Gaps / Mismatches
- Need to confirm the source pixels from the active document are actually converted into a custom tip for Define Brush Preset, not merely the current brush settings.
- Photoshop’s brush preset picker placement in Options Bar/right-click is only partially covered by panel workflows.

## Scope Decision
Fix.

## Recommended Follow-up
Add/verify an end-to-end test: paint black marks, invoke `Edit > Define Brush Preset…`, select the resulting tip, and stamp with the captured shape.
