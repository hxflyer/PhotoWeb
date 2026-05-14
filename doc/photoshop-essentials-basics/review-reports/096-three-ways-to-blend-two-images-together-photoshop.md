# 096 three-ways-to-blend-two-images-together-photoshop
- Lesson path: `doc/photoshop-essentials-basics/three-ways-to-blend-two-images-together-photoshop/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `09-blend-modes`

## Lesson Expectations
- Blend with layer Opacity in the Layers panel, blend modes, and layer masks (`cc-blend-images-3ways-photoshop-layer-opacity-option-e874d52c.png`, `cc-blend-images-3ways-layers-panel-blend-mode-option-photoshop-1530a99d.png`, `cc-blend-images-3ways-add-layer-mask-icon-photoshop-da0a539a.png`).
- Numeric keys set opacity quickly; black brush on a white mask reveals lower layer.

## Photoweb Coverage
- Layers panel exposes opacity and blend mode controls (`src/components/Panels/LayersPanel.tsx:649`, `src/components/Panels/LayersPanel.tsx:295`).
- Blend mode compositor and tests cover Photoshop modes (`src/core/blendModes.ts:132`, `src/test/blendModes.test.ts:13`).
- Layer masks and mask painting are implemented/tested (`src/test/17-layer-masks.test.tsx`, `src/test/maskPaint.test.ts`).

## Gaps / Mismatches
- Layer opacity keyboard shortcuts (1 = 10%, 30 = 30%, 0 = 100%) were not found.
- No issue found for the core three blend methods themselves.

## Scope Decision
Fix: opacity numeric shortcuts are in-scope polish.

## Recommended Follow-up
Add Photoshop-style numeric opacity shortcuts for layer-focused tools.
