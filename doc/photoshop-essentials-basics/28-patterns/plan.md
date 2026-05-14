# 28 Patterns Plan

Cluster: `28-patterns`

## Scope

- Make the repeating-pattern lessons executable in Photoweb:
  - Define a selected tile as a pattern.
  - Fill a layer or selection with the active pattern.
  - Use Offset / Wrap Around to build seamless tile recipes.

## Implementation

- Centralize pattern tile capture in `src/tools/patterns.ts`.
- Reuse the helper from both Edit > Define Pattern and the Pattern Presets panel.
- Add a compact Edit > Fill dialog that can apply foreground color, background color, or selected pattern.
- Add `other-offset` filter support and surface it under Filter > Other > Offset.
- Cover the flow with focused tests in `src/test/28-patterns.test.tsx`.

## Acceptance

- A selected region defines a pattern tile with the selection bounds and masked transparency.
- Edit > Fill can apply the active pattern to the active layer/selection and creates undoable history.
- Filter > Other > Offset defaults to half-layer offsets from the menu and supports Wrap Around.
- Existing Pattern Presets, Paint Bucket, and pattern-related bug-fix tests remain green.
