# 08a Layer Operations Plan

## Goals

### Feature 1 — Group Selected Layers Shortcut

**What it does** — Ctrl/Cmd+G groups the selected non-Background layers into a new folder group. Ctrl/Cmd+Shift+G ungroups the active group.

**Photoshop habit preserved** — Select one or more related layers, press Ctrl/Cmd+G, and keep working with them as a group.

**Invocation** — Keyboard shortcut; existing Layer menu and Layers panel group commands remain available.

**Pre-conditions** — At least one selected non-Background layer for grouping, or an active group for ungrouping.

**Post-conditions** — Selected layers share the new group's `parentId`; the group becomes the active layer.

### Feature 2 — Move Tool Align / Distribute Buttons

**What it does** — Adds Move Tool Options Bar icon buttons for Align Left, Horizontal Center, Right, Top, Vertical Center, Bottom, plus Distribute Horizontal Centers and Vertical Centers.

**Photoshop habit preserved** — With Move Tool active, select layers first, then use Options Bar icons to align or distribute their content.

**Invocation** — Move Tool Options Bar.

**Pre-conditions** — Align buttons enable with two or more selected layers; Distribute buttons enable with three or more.

**Post-conditions** — Existing history-aware store actions move the selected layers/groups.

### Feature 3 — Drag-Copy Layer Effects

**What it does** — Makes the Layers panel `fx` badge a drag-copy handle. Dropping it onto another layer copies the source layer's effects to the target.

**Photoshop habit preserved** — Transfer effects between layers directly from the Layers panel without opening a dialog.

**Invocation** — Drag the `fx` badge from a layer with effects onto a target layer row.

**Pre-conditions** — Source layer has at least one enabled effect and target layer is different from the source.

**Post-conditions** — Target layer receives a deep copy of the source effects.

## Out Of Scope This Tick

- Per-effect-name rows under each layer are not rendered yet, so copying one individual effect by name is not available.
- Stamp Visible still uses the existing layer-canvas compositing path rather than a full rendered-scene compositor pass for every possible effect/mask edge case.

## Files To Edit / Files To Create

- Shortcut semantics: `src/App.tsx`.
- Move Tool UI: `src/components/Panels/OptionsBar.tsx`.
- Effects drag-copy UI: `src/components/Panels/LayersPanel.tsx`.
- Regression coverage: `src/test/08a-layer-ops.test.tsx`.
- Docs: `doc/photoshop-essentials-basics/08a-layer-ops/gap-report.md`, `plan.md`.

## Test Cases

- Ctrl/Cmd+G groups the selected layers into the new group.
- `;` toggles active-layer visibility once.
- Move Tool Options Bar align/distribute buttons invoke the store operations.
- Dragging a source layer's `fx` badge onto a target layer copies the effect parameters.

## Divergences From Photoshop

- The `fx` badge acts as a forgiving direct effects-copy handle; Photoshop requires the Alt/Option modifier for this drag-copy gesture.

## Stop Conditions

- Stop if grouping selected layers breaks existing empty-group creation, if Options Bar buttons bypass history, or if effects drag interferes with existing layer reorder/group drag behavior.
