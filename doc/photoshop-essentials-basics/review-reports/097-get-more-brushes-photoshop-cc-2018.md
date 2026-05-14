# 097 get-more-brushes-photoshop-cc-2018
- Lesson path: `doc/photoshop-essentials-basics/get-more-brushes-photoshop-cc-2018/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `20b-brush-presets`

## Lesson Expectations
- Window > Brushes opens Brushes panel; panel menu > Get More Brushes opens Adobe's brush download page (`cc-get-more-brushes-open-brushes-panel-photoshop-9925643c.png`, `cc-get-more-brushes-get-more-brushes-photoshop-cc2018-d0994d43.png`).
- Downloaded `.abr` files install into Photoshop and appear as new Brush folders (`cc-get-more-brushes-installed-brush-set-photoshop-cc2018-961fa57e.png`).

## Photoweb Coverage
- Window > Brushes toggles the Brushes panel (`src/components/layout/MenuBar.tsx:699`).
- Brushes panel has a menu item for Get More Brushes and opens Adobe's brush page with toast feedback (`src/components/Panels/BrushPresetsPanel.tsx:83`, `src/components/Panels/BrushPresetsPanel.tsx:150`).
- Tests verify the panel workflow and toast (`src/test/20b-brush-presets.test.tsx:147`).

## Gaps / Mismatches
- `.abr` import/install is not implemented and is already logged as a deliberate Adobe/proprietary-asset divergence (`doc/photoshop-essentials-basics/divergence-log.md:215`).

## Scope Decision
Divergence already accepted.

## Recommended Follow-up
No action.
