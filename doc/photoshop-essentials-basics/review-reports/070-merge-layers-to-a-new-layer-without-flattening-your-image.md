# 070 merge-layers-to-a-new-layer-without-flattening-your-image
- Lesson path: `doc/photoshop-essentials-basics/merge-layers-to-a-new-layer-without-flattening-your-image/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 08a-layer-ops

## Lesson Expectations
- Select top layer, press Shift+Ctrl+Alt+E / Shift+Command+Option+E to stamp visible layers onto a new layer above originals.
- Original layers remain untouched; rename the new layer, commonly `Merged`.
- Lesson contrasts this with destructive Layer > Flatten Image.
- Screenshots grounding UI: `layers-merge-layers-layers-panel-multiple-layers-5adb94af.png`, `layers-merge-layers-flatten-image-command-photoshop-51c7f9e2.png`, `layers-merge-layers-merged-layers-new-layer-photoshop-21daf721.png`.

## Photoweb Coverage
- Menu exposes Layer > Stamp Visible with `⌘⌥⇧E` in `src/components/layout/MenuBar.tsx:505`.
- Global shortcut calls `stampVisible()` for meta+shift+alt+E in `src/App.tsx:643`.
- Store composites visible layers into a new `Merged Visible` layer without removing originals in `src/store/layersSlice.ts:1066`.
- Layers panel flyout includes Stamp Visible in `src/components/Panels/LayersPanel.tsx:615`.

## Gaps / Mismatches
- New layer is appended top-wise according to Photoweb's internal order; verify panel visual position matches "above the topmost layer" in Photoshop.
- Default name is `Merged Visible` rather than lesson's manual `Merged`; acceptable but slightly different.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action unless layer ordering audit reveals the stamped layer appears in the wrong panel position.

