# 08a Layer Operations Gap Report

## Lessons Reviewed

- `merge-layers-to-a-new-layer-without-flattening-your-image` — Stamp Visible via Shift+Ctrl/Cmd+Alt/Option+E to create a merged copy without destroying source layers.
- `copy-layer-effects-photoshop` — Alt/Option-drag effects or the `Effects` label between layers; Copy/Paste Layer Style remains available for full style transfer.
- `auto-select-layers-photoshop` — Move Tool Options Bar exposes Auto-Select with Layer/Group target and temporary Ctrl/Cmd auto-select.
- `align-layers` — Move Tool Options Bar exposes Align and Distribute buttons for selected layers/groups.
- `layer-groups` — Ctrl/Cmd+G groups selected layers, Ctrl/Cmd+Shift+G ungroups, and group rows preserve folder/triangle/visibility behavior.

## Current Photoweb Coverage

- Stamp Visible already existed in [layersSlice.ts](../../../src/store/layersSlice.ts) and was wired to the Layer menu, Layers panel flyout, and Shift+Ctrl/Cmd+Alt/Option+E.
- Move Tool Auto-Select already existed with Layer/Group scope in [OptionsBar.tsx](../../../src/components/Panels/OptionsBar.tsx), and [move.ts](../../../src/tools/move.ts) honors the setting plus temporary Ctrl/Cmd auto-select.
- Store-level align/distribute and group/ungroup operations existed in [layersSlice.ts](../../../src/store/layersSlice.ts).
- Copy/Paste Layer Style existed through menu/properties actions.

## Gaps

- The Move Tool Options Bar did not expose Align/Distribute buttons, so the lesson's primary invocation path was hidden.
- Ctrl/Cmd+G always created a new empty group instead of grouping the selected layer set.
- The Layers panel showed an `fx` badge, but it was passive; users could not drag effects between layers.
- Existing tests did not catch the Photoshop shortcut and UI paths for this cluster.

## Photoshop-Habit Mismatches

- Photoshop users expect to select layers first and press Ctrl/Cmd+G to wrap those selected layers into a folder group.
- Photoshop users expect align/distribute commands to sit next to Auto-Select in the Move Tool Options Bar, not only in the Layer menu.
- Photoshop users expect the layer-effects affordance in the Layers panel to be a transfer handle.

## UI / UX Issues

- Align/distribute actions were discoverable only through menus, which makes the Move Tool lesson feel incomplete.
- The `fx` badge had no hover/copy affordance and did not communicate what could be done with effects.

## Photoshop Divergences Worth Keeping

- Photoweb treats the `fx` badge as a direct copy handle. Photoshop specifically requires Alt/Option while dragging the effect name or `Effects` label; the browser UI keeps the same copy target but is more forgiving on the modifier.
