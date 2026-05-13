# 15 Pen Paths Plan

## Implementation

1. Export `loadPathAsSelection` / `loadActivePathAsSelection` from the Pen tool module using the existing Bezier path tracer to rasterize a closed path into a selection mask.
2. Wire Ctrl/Cmd+Enter in the Pen and Curvature Pen tools to load the active path as a selection.
3. Add a Paths panel Load Path as Selection button.
4. Add a `curvature-pen` tool that shares Pen Tool options and recomputes smooth handles after point edits.
5. Add `curvature-pen` to ToolId, Toolbar P flyout, keyboard cycling, Options Bar, Status Bar, and shortcut help.
6. Add tests for path-to-selection conversion, Paths panel button wiring, shortcut conversion, and Curvature Pen curve/corner behavior.

## Verification

- `npx tsc -b`
- `npm run lint`
- targeted Pen/Paths tests
- `npm test`
