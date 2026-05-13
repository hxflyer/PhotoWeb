# 07a Layers Panel Plan

## Goals

### Feature 1 — New Layer Dialog

**What it does** — Creating a layer through `Layer > New > Layer...`, `Shift+Cmd/Ctrl+N`, or Alt/Option-clicking the Layers panel New Layer button opens a dialog where the user can name the layer and choose mode, opacity, and fill before the layer is created.

**Photoshop habit preserved** — `layer-shortcuts` shows Alt/Option-clicking the New Layer icon and `Shift+Ctrl/Cmd+N` opening the New Layer dialog (`layers-layers-keyboard-shortcuts-photoshop-new-layer-dialog-box-f5d719a2.png`).

**Invocation** — `Layer > New > Layer...`; `Shift+Cmd/Ctrl+N`; Alt/Option-click the New Layer button; Layers panel flyout `New Layer...`.

**Pre-conditions** — An editable document exists. With no active layer, the new layer is added at the top of the stack.

**Interaction choreography** — User invokes the command, dialog focus lands in Name, edits fields, presses OK or Enter to create, or Escape/Cancel to close. `Shift+Cmd/Ctrl+Alt/Option+N` bypasses the dialog and creates a generic layer.

**Visual feedback** — A modal titled `New Layer` appears, matching the Photoshop naming flow shown in the lesson screenshot. The new layer becomes active in the Layers panel.

**Post-conditions** — A single `New Layer` history command creates the layer, selects it, and applies name/mode/opacity/fill.

**Edge cases** — Empty names fall back to `Layer`; opacity/fill clamp to 0-100%; direct creation still works from the plain New Layer button.

### Feature 2 — Layer Stack And Visibility Shortcuts

**What it does** — Keyboard shortcuts move the active layer forward/back or to the top/bottom, while `;` toggles its visibility eye.

**Photoshop habit preserved** — `layer-shortcuts` specifies `Ctrl/Cmd+[`, `Ctrl/Cmd+]`, `Shift+Ctrl/Cmd+[`, `Shift+Ctrl/Cmd+]`, and visibility-eye workflows (`layers-layers-keyboard-shortcuts-photoshop-jump-layer-top-b930b342.png`, `layers-layers-keyboard-shortcuts-photoshop-jump-layer-bottom-176cf6d6.png`, `layers-layers-keyboard-shortcuts-photoshop-layer-visibility-icon-b482ea10.png`).

**Invocation** — `Cmd/Ctrl+]`, `Cmd/Ctrl+[`, `Shift+Cmd/Ctrl+]`, `Shift+Cmd/Ctrl+[`, and `;`.

**Pre-conditions** — A layer is active. The command is ignored at stack limits.

**Interaction choreography** — Press the shortcut; the Layers panel row moves immediately or the eye state flips. No dialog opens.

**Visual feedback** — The active row remains selected while its position or visibility icon updates.

**Post-conditions** — Reorder and visibility commands are recorded as existing layer history commands.

**Edge cases** — Inputs/selects keep keyboard focus and are not hijacked; unmodified `[` and `]` remain brush shortcuts.

### Feature 3 — Layers Panel Options: Thumbnail Size

**What it does** — The Layers panel flyout exposes thumbnail size choices and a Panel Options dialog with Small, Medium, Large, and None. The choice is persisted locally.

**Photoshop habit preserved** — `layers-panel` and `essential-layers-panel-preferences` show `Panel Options...` and thumbnail size choices including None (`layers-layers-panel-photoshop-layers-panel-options-351aa256.png`, `layers-layers-panel-preferences-thumbnail-size-options-09a29027.gif`).

**Invocation** — Layers panel flyout `Thumbnail Size` submenu or `Panel Options...`.

**Pre-conditions** — Layers panel is visible.

**Interaction choreography** — User opens the flyout, chooses a thumbnail size, or opens Panel Options, selects a radio choice, and clicks OK. Rows resize immediately.

**Visual feedback** — Thumbnails shrink, enlarge, or disappear; row height compacts when thumbnails are off.

**Post-conditions** — Preference is stored in localStorage and reused on panel mount.

**Edge cases** — Storage failures are ignored; mask thumbnails remain visible when a layer has a mask.

## Out Of Scope This Tick

- Background layer special locking and conversion are deferred to `07b-background-layer`.
- Default masks on fill/adjustment layers and copied-layer naming preferences are deferred; they are preferences beyond the 07a row/thumbnail/shortcut contract.

## Files To Edit / Files To Create

- New Layer dialog: `src/components/Dialogs/NewLayerDialog.tsx`, `src/App.tsx`, `src/store/types.ts`, `src/store/panelsSlice.ts`, `src/store/layersSlice.ts`, `src/components/layout/MenuBar.tsx`, `src/components/Panels/LayersPanel.tsx`.
- Shortcuts: `src/App.tsx`, `src/test/07a-layers-panel.test.tsx`.
- Thumbnail options: `src/components/Panels/LayersPanel.tsx`, `src/test/07a-layers-panel.test.tsx`.

## Test Cases

- `Shift+Cmd+N` opens the New Layer dialog and creates a named layer with mode/opacity/fill.
- `Shift+Cmd+Option+N` bypasses the dialog and creates a generic layer.
- `Cmd+]` and `Shift+Cmd+[` move the active layer through the stack.
- `;` toggles the active layer's visibility.
- Layers Panel Options can turn preview thumbnails off.
- Alt/Option-clicking the New Layer button opens the dialog; plain click adds a layer above the active layer.

## Divergences From Photoshop

- Photoshop also offers copied-layer naming and default-mask preferences in Panel Options; photoweb defers them because this tick is limited to row structure, thumbnails, and layer shortcut behavior.

## Stop Conditions

- Stop if layer history breaks, if shortcut handling conflicts with text inputs, or if thumbnail preferences require a broader persistent preferences subsystem.
