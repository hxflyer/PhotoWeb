# 043 find-missing-shapes-gradients-and-patterns-in-photoshop-cc-2020
- Lesson path: `doc/photoshop-essentials-basics/find-missing-shapes-gradients-and-patterns-in-photoshop-cc-2020/lesson.md`
- Scope status: `out_of_scope: version_changelog`
- Cluster coverage: none

## Lesson Expectations
- Restore hidden Photoshop 2020 legacy preset libraries from panel flyout menus: Legacy Gradients, Legacy Patterns and Textures, Legacy Shapes and More.
- Gradients/Patterns/Shapes panels use collapsible folders, panel menus, thumbnail sizing, and Ctrl/Cmd-click to expand or collapse all groups.
- Screenshots grounding UI: `2021-missing-gradients-patterns-shapes-open-gradients-panel-1382e5b0.png`, `2021-missing-gradients-patterns-shapes-legacy-gradients-menu-command-5cecaa1c.png`, `2021-missing-gradients-patterns-shapes-legacy-shapes-and-more-photoshop-4e029ca6.png`.

## Photoweb Coverage
- Modern preset systems exist, but not Photoshop legacy-library restoration.
- Shape presets are grouped in `src/tools/customShapes.ts:100` and rendered by the Shapes panel in `src/components/Panels/ShapesPanel.tsx:40`.
- Swatch group collapse including Cmd/Ctrl all-toggle is implemented in `src/components/Panels/SwatchesPanel.tsx:120` and tested in `src/test/23-color-swatches.test.tsx:96`.

## Gaps / Mismatches
- No Legacy Gradients/Patterns/Shapes menu commands.
- No Photoshop version-migration concept for missing 2020 presets.
- Gradients panel coverage is weaker than Swatches/Shapes; however this specific lesson is about Adobe preset churn, not core editing.

## Scope Decision
out of scope

## Recommended Follow-up
No action for the legacy-restoration commands; keep any preset-library improvements tied to in-scope Gradients, Shapes, Swatches, or Patterns clusters.

