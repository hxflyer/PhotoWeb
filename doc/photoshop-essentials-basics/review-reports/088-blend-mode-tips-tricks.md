# 088 blend-mode-tips-tricks
- Lesson path: `doc/photoshop-essentials-basics/blend-mode-tips-tricks/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `09-blend-modes`

## Lesson Expectations
- Layer blend modes live at the top of the Layers panel (`blend-modes-tips-tricks-photoshop-layers-panel-blend-modes-65c97763.png`).
- Shift+Plus / Shift+Minus cycle layer blend modes when Move or selection tools are active.
- Direct shortcuts select specific modes, e.g. Shift+Alt+N Normal, M Multiply, S Screen, O Overlay, F Soft Light, C Color.
- Opacity keyboard shortcuts adjust intensity.

## Photoweb Coverage
- Photoshop-ordered blend mode list and compositor mapping exist (`src/core/blendModes.ts:46`, `src/core/blendModes.ts:132`).
- Layers panel blend-mode control and hover/live-preview behavior are implemented (`src/components/Panels/LayersPanel.tsx:295`, `src/components/Panels/LayersPanel.tsx:311`).
- Shift+Plus/Minus and direct mode shortcuts are tested (`src/test/09-blend-modes.test.tsx:57`, `src/test/09-blend-modes.test.tsx:83`).

## Gaps / Mismatches
- Opacity number-key shortcuts from this lesson were not found in the blend-mode tests or shortcuts listing.
- Some modes fall back to manual pixel blending where Canvas globalCompositeOperation lacks native support; that is acceptable if visual tests remain strong (`src/core/blendModes.ts:280`).

## Scope Decision
Fix: layer opacity number shortcuts are an in-scope Photoshop habit.

## Recommended Follow-up
Add layer opacity numeric shortcuts for compatible tools and test two-key percentages.
