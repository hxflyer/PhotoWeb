# 195 repeating-patterns-colors-gradients
- Lesson path: `doc/photoshop-essentials-basics/repeating-patterns-colors-gradients/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `28-patterns`

## Lesson Expectations
- New Fill/Adjustment Layer icon creates Solid Color fill layer (`repeating-patterns-colors-new-fill-layer-icon-f5e9cc4a.gif`).
- A Solid Color or Gradient fill layer above a black pattern is set to Multiply so the pattern shows through (`repeating-patterns-colors-solid-color-fill-layer-89b359d3.gif`).
- Gradient Fill dialog can be reopened/changed.

## Photoweb Coverage
- Layer menu exposes New Fill Layer > Solid Color/Gradient in `src/components/layout/MenuBar.tsx:397`.
- Fill layer data is stored and paintable through `src/core/fillLayer.ts` and `src/store/layersSlice.ts`.
- Blend mode Multiply is available through the Layers panel and blend-mode system.
- Pattern definitions and fills are tested in `src/test/28-patterns.test.tsx:79`.

## Gaps / Mismatches
- No evidence of a Photoshop-style Gradient Fill dialog for fill layers; current menu appears to add a default gradient layer.
- Reopening a fill layer to change color/gradient should be verified in Properties panel tests.

## Scope Decision
Fix.

## Recommended Follow-up
Add editable Solid Color/Gradient fill-layer UI parity or document current simplified fill-layer behavior.
