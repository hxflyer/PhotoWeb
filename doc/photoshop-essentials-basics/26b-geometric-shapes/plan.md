# 26b Geometric Shapes Plan

Cluster: `26b-geometric-shapes`

## Goals

- Match Photoshop's visible geometric Shape Tool family for the lesson scope.
- Make the Options Bar expose the settings users need before drawing each shape.
- Prove that path operations can be selected from the Shape Tool Options Bar and applied to the active shape.

## Scope

- Add a dedicated Triangle Tool to the U shortcut group.
- Reuse the existing shape layer model for geometric live shapes.
- Add Options Bar controls for:
  - corner radius for Rounded Rectangle, Triangle, and Polygon;
  - Polygon sides, Star, Star Ratio, Smooth Corners, Smooth Indents;
  - Line weight, start arrow, end arrow, and arrow size;
  - New / Combine / Subtract / Intersect / Exclude operations.
- Keep Custom Shape library expansion for `27a-custom-shape-tool`.

## Verification Strategy

- Unit/integration tests cover the toolbar, Options Bar state, generated `shapeData`, and boolean operation effects.
- Run TypeScript, focused shape tests, lint, full tests, and dev-server smoke before stamping the work queue.
