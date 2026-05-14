# 064 using-layer-effects-and-layer-styles-in-photoshop-cc-2020-complete-guide
- Lesson path: `doc/photoshop-essentials-basics/using-layer-effects-and-layer-styles-in-photoshop-cc-2020-complete-guide/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 10-layer-styles

## Lesson Expectations
- Layer effects are added from Layer > Layer Style or the Layers panel `fx` icon; layer styles are saved combinations of effects/blending options.
- Effects are non-destructive, visible under the layer row, can be hidden/deleted/copied, and cannot apply to Background layer.
- Photoshop offers 10 core effects plus Styles panel presets.
- Screenshots grounding UI: `layer-effects-layer-layer-style-effects-4b01f69b.png`, `layer-effects-layer-effects-icon-layers-panel-photoshop-db3a0d23.png`, `layer-effects-add-layer-effect-layers-panel-photoshop-66c72e7d.png`, `layer-effects-layer-effects-greyed-out-d889238c.png`.

## Photoweb Coverage
- Layer Style menu includes Blending Options, all core effect entries, Copy/Paste/Clear, and Scale Effects in `src/components/layout/MenuBar.tsx:441`.
- Layers panel defines 10 Photoshop-style effect menu entries in `src/components/Panels/LayersPanel.tsx:20`.
- Store blocks paste/apply style onto Background layers in `src/store/layersSlice.ts:1538`.
- Tests cover fx button/menu, Background exclusion, menu effects, and saved Styles panel application in `src/test/10-layer-styles.test.tsx:36`.

## Gaps / Mismatches
- Need verify per-effect expand/collapse/visibility UI in Layers panel; not all effect-row details were inspected.
- Photoshop's CC 2020 preset libraries and legacy style restoration are broader than Photoweb's curated Styles panel.
- Background layer UI should keep effects visibly disabled wherever the entry appears.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action unless effect row visibility/expansion proves incomplete in user testing.

