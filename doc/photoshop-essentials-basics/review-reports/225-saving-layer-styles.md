# 225 saving-layer-styles
- Lesson path: `doc/photoshop-essentials-basics/saving-layer-styles/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `10-layer-styles`

## Lesson Expectations
- Build effects such as Stroke and Drop Shadow in Layer Style dialog, then save them as a named style with `New Style`.
- Styles appear in Styles panel and can be applied to other layers; include layer blending options when chosen.
- Layer `fx` badge opens/copies styles; styles can be loaded/reused.
- UI screenshots: `saving-layer-styles-new-style-button-7e994d3f.gif`, `saving-layer-styles-new-style-dialog-box-98aeff1b.gif`, `saving-layer-styles-style-added-styles-palette-55f49320.gif`.

## Photoweb Coverage
- Layer Style dialog includes `New Style...` and New Style modal options (`src/components/Dialogs/LayerStyleDialog.tsx:400-505`).
- Presets slice stores/applies layer style presets with effects, blend mode, opacity, and fill (`src/store/presetsSlice.ts:186-218`).
- Styles panel lists and applies style presets (`src/components/Panels/StylesPanel.tsx:4-63`).
- Layers panel exposes `fx` badge and style copy/drag behavior (`src/components/Panels/LayersPanel.tsx:924-932`); Layer menu has Copy/Paste/Clear Layer Style (`src/components/layout/MenuBar.tsx:441-448`).
- Tests cover effects, copy/paste, style UI, and presets (`src/test/10-layer-styles.test.tsx`, `src/test/effectsBatch4.test.tsx`, `src/test/layerStyleDialogBatchF.test.tsx`).

## Gaps / Mismatches
- Style import/export set semantics may not match Photoshop `.asl`; photoweb uses local/internal preset storage.
- Need to verify right-click style preset management closely matches Photoshop's Styles panel menu.

## Scope Decision
Fix.

## Recommended Follow-up
Add a Styles panel management audit/test for rename/delete/apply and document the accepted non-`.asl` storage divergence.
