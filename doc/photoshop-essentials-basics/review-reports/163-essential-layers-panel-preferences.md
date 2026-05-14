# 163 essential-layers-panel-preferences
- Lesson path: `doc/photoshop-essentials-basics/essential-layers-panel-preferences/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `07a-layers-panel`

## Lesson Expectations
- Opens Layers panel flyout > Panel Options or right-clicks the empty panel area.
- Sets thumbnail size to Small, Medium, Large, or None.
- Toggles default masks on fill/adjustment layers and "Add copy to Copied Layers and Groups."
- Grounding screenshots include `layers-layers-panel-preferences-layers-panel-options-297e8054.gif`, `layers-layers-panel-preferences-thumbnail-size-options-09a29027.gif`, `layers-layers-panel-preferences-use-default-masks-fill-layers-c3baccfa.gif`, and `layers-layers-panel-preferences-add-copy-3f8b969e.gif`.

## Photoweb Coverage
- `src/components/Panels/LayersPanel.tsx:33` stores thumbnail preference state.
- `src/components/Panels/LayersPanel.tsx:196` implements Layers Panel Options, and `src/components/Panels/LayersPanel.tsx:592` exposes Panel Options from the flyout.
- `src/test/07a-layers-panel.test.tsx:33` includes panel option coverage.

## Gaps / Mismatches
- Default mask preferences for fill/adjustment layers were not found.
- "Add copy to Copied Layers and Groups" naming preference was not found.
- Right-click-empty-panel access to Panel Options needs explicit verification.

## Scope Decision
Fix

## Recommended Follow-up
Decide whether non-thumbnail layer preferences are worthwhile for Photoweb; if yes, add default-mask and copy-name settings plus tests.
