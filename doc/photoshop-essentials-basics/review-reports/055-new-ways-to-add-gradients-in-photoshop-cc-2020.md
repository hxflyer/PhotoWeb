# 055 new-ways-to-add-gradients-in-photoshop-cc-2020
- Lesson path: `doc/photoshop-essentials-basics/new-ways-to-add-gradients-in-photoshop-cc-2020/lesson.md`
- Scope status: `out_of_scope: version_changelog`
- Cluster coverage: none

## Lesson Expectations
- Drag a Gradients panel thumbnail onto Background/pixel/shape/type layer.
- Dropping on a Background creates a Gradient fill layer; selecting another thumbnail swaps the gradient.
- Blend with photo via fill-layer blend mode and opacity in Layers panel.
- Screenshots grounding UI: `2020-apply-gradients-drag-and-drop-gradient-photoshop-03bf9ea6.jpg`, `2020-apply-gradients-gradient-fill-layer-photoshop-06d9eb76.png`, `2020-apply-gradients-gradient-fill-layer-blend-mode-8d0535f6.png`.

## Photoweb Coverage
- Gradient fill layers can be created from menus in `src/components/layout/MenuBar.tsx:398` and edited through Properties fill-layer controls in `src/components/Panels/PropertiesPanel.tsx:600`.
- Blend modes and opacity exist in the Layers panel; live preview is implemented in `src/components/Panels/LayersPanel.tsx:281`.

## Gaps / Mismatches
- I did not find a Gradients panel component or drag-from-gradient-thumbnail workflow analogous to Photoshop 2020.
- The lesson itself is version-changelog scoped and excluded, but the drag/drop gradient panel behavior could still be useful if the Gradients panel becomes in-scope.

## Scope Decision
out of scope

## Recommended Follow-up
No action for the Photoshop 2020 new-feature workflow; track Gradients panel drag/drop only under gradient cluster work.

