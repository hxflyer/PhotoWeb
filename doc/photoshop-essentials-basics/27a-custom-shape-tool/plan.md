# 27a Custom Shape Tool Plan

Cluster: `27a-custom-shape-tool`

## Goals

- Make Custom Shape Tool preset selection feel like Photoshop's picker/set workflow.
- Add the modern Shapes panel as a docked panel with grouped custom shape presets.
- Let Shapes panel presets create real Shape layers in the document.

## Scope

- Preserve the existing Custom Shape Tool drawing behavior.
- Add grouped built-in preset metadata and picker filtering.
- Add a docked Shapes panel with collapsible groups and drag payloads.
- Wire the canvas drop target to create a custom Shape layer from a dropped preset.
- Keep user-defined shape presets and `.csh` save/load for `27b-custom-shape-presets`.

## Verification Strategy

- Unit/integration tests cover set metadata, picker menu loading, panel selection/collapse, center-add creation, and undoable preset layer creation.
- Run TypeScript, focused tests, lint, full tests, and dev-server smoke before stamping the queue.
