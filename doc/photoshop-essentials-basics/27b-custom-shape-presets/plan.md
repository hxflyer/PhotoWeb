# 27b Custom Shape Presets Plan

Cluster: `27b-custom-shape-presets`

## Goals

- Let users define their own Custom Shape presets from active Shape layers.
- Let custom shape preset groups be saved and loaded later.
- Keep the Custom Shape Tool, picker, and Shapes panel synchronized with user presets.

## Scope

- Browser-local user custom shape groups.
- Edit > Define Custom Shape command.
- JSON save/load helpers for shape sets.
- Tests for conversion, persistence, import/export, and menu access.

## Deferred

- Native `.csh` binary import/export.
- Full Preset Manager dialog with multi-select and thumbnail-size choices.
- Compound vector subpath preservation beyond Photoweb's current `ShapeData` model.
