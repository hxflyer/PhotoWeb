# 139 layer-shortcuts
- Lesson path: `doc/photoshop-essentials-basics/layer-shortcuts/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `07a-layers-panel`

## Lesson Expectations
- Opens Layers panel with `F7`.
- Creates a layer with `Shift+Cmd/Ctrl+N` and dialog, or bypasses the dialog with `Shift+Cmd/Ctrl+Alt/Option+N`.
- Duplicates with `Cmd/Ctrl+J`, moves selected layers with `Cmd/Ctrl+[` and `Cmd/Ctrl+]`, sends to bottom/top with Shift variants, and Alt/Option-clicks the eye to solo visibility.
- Grounding screenshots include `layers-layers-keyboard-shortcuts-photoshop-new-layer-dialog-box-f5d719a2.png`, `layers-layers-keyboard-shortcuts-photoshop-jump-layer-top-b930b342.png`, and `layers-layers-keyboard-shortcuts-photoshop-layer-visibility-icon-b482ea10.png`.

## Photoweb Coverage
- `src/components/Panels/LayersPanel.tsx:408` keeps Layers panel UI state and `src/components/Panels/LayersPanel.tsx:728` implements rows, visibility, selection, thumbnails, and layer interaction.
- `src/components/Panels/LayersPanel.tsx:1029` exposes bottom actions such as add and delete layer.
- `src/store/layersSlice.ts:683` handles visibility; `src/store/layersSlice.ts:715` handles blend mode changes with background guards.
- `src/test/07a-layers-panel.test.tsx:33` covers layer panel shortcuts and panel options behavior.

## Gaps / Mismatches
- The code coverage found layer interactions, but not full Photoshop keyboard parity for every shortcut in the lesson, especially dialog-vs-bypass new layer and all bracket move variants.
- Alt/Option-click eye solo behavior should be explicitly tested if it is intended to be supported.

## Scope Decision
Fix

## Recommended Follow-up
Add shortcut contract tests for `F7`, new-layer dialog/bypass variants, duplicate via `Cmd/Ctrl+J`, bracket layer ordering, and Alt/Option visibility solo.
