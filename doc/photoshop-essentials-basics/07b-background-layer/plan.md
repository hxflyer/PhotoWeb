# 07b Background Layer Plan

## Goals

### Feature 1 — Real Background Layer State

**What it does** — Solid-color new documents and opened images create a special Background layer with `isBackground`, bottom-stack rules, position/transparency locking, name `Background`, and normal opacity/fill/blend values. Transparent new documents create a normal transparent layer.

**Photoshop habit preserved** — The lessons show opened photos appearing on a locked Background row (`layers-background-layer-photoshop-layers-panel-27279322.png`) and transparent deletion being unavailable (`layers-background-layer-photoshop-fill-command-ba77b7b0.png`).

**Invocation** — File > New with a non-transparent background; File > Open image.

**Pre-conditions** — Document creation succeeds and canvas allocation is within guardrails.

**Interaction choreography** — A document opens; the Layers panel shows an italic `Background` row at the bottom with a lock icon. Move/reorder/transparent-erasing gestures are ignored while it remains Background.

**Visual feedback** — The row is italic and locked; blend/opacity/fill controls are disabled when selected.

**Post-conditions** — Background state persists in history and saved `.pwbdoc` manifests.

**Edge cases** — Transparent new documents use a normal `Layer 1`; existing documents without `isBackground` load as normal layers unless the manifest says otherwise.

### Feature 2 — Convert Background To Normal Layer

**What it does** — Clicking the Background row's lock icon, using `Layer > New > Layer from Background`, or renaming Background to another name converts it into a normal unlocked layer named `Layer 0` by default.

**Photoshop habit preserved** — CC lesson shows clicking the lock icon instantly producing `Layer 0` (`layers-background-layer-photoshop-unlock-background-layer-653c4894.png`, `layers-background-layer-photoshop-background-layer-unlocked-d681f455.png`).

**Invocation** — Layers panel lock icon; `Layer > New > Layer from Background`; double-click name and rename.

**Pre-conditions** — Active layer is Background.

**Interaction choreography** — User clicks the lock icon; the lock disappears, the name becomes `Layer 0`, blend/opacity/fill controls enable, and the layer can now move/reorder/delete/erase to transparency.

**Visual feedback** — Italic text returns to normal, lock icon disappears.

**Post-conditions** — One `Layer From Background` history command records the conversion.

**Edge cases** — Renaming a normal layer to `Background` does not make it a real Background layer, matching Photoshop.

### Feature 3 — Background From Layer

**What it does** — `Layer > New > Background from Layer` converts a normal layer into the document's Background layer, sends it to the bottom, removes any previous Background state, and composites transparency over the current background color.

**Photoshop habit preserved** — Lessons show converting a chosen normal layer into the official Background layer through `Layer > New > Background from Layer` (`layers-background-layer-photoshop-new-background-from-layer-348d4def.png`).

**Invocation** — `Layer > New > Background from Layer`.

**Pre-conditions** — Active layer exists, is not a group, and is not already Background.

**Interaction choreography** — User chooses the menu item; the active layer moves to the bottom and becomes an italic locked `Background`.

**Visual feedback** — Row moves to the bottom, name changes to Background, lock icon appears.

**Post-conditions** — One `Background from Layer` history command records the conversion.

**Edge cases** — Transparent pixels are flattened over the current Background color because real Background layers do not support alpha.

## Out Of Scope This Tick

- A modal warning on Move Tool drag is not implemented; photoweb blocks the gesture silently, matching existing lock behavior.
- Older Photoshop's New Layer dialog for Background conversion is skipped in favor of the current CC one-click lock behavior.

## Files To Edit / Files To Create

- Background model/persistence/history: `src/core/Layer.ts`, `src/core/persistence.ts`, `src/core/history.ts`, `src/store/historySlice.ts`.
- Creation and layer operations: `src/store/documentSlice.ts`, `src/store/layersSlice.ts`.
- UI/menu: `src/components/Panels/LayersPanel.tsx`, `src/components/layout/MenuBar.tsx`, `src/App.tsx`.
- Transparency tools: `src/tools/eraser.ts`, `src/tools/magicEraser.ts`, `src/tools/backgroundEraser.ts`, `src/components/Canvas/Viewport.tsx`.
- Tests: `src/test/07b-background-layer.test.tsx`.

## Test Cases

- Solid new documents create locked Background; transparent documents create normal transparent Layer 1.
- Layers panel disables blend/opacity/fill for Background and lock-click converts to Layer 0.
- Background cannot move in the stack, and other layers cannot move below it.
- Background ignores opacity/fill/blend changes and Magic Eraser cannot create transparency.
- Background from Layer makes the chosen layer the bottom Background layer.

## Divergences From Photoshop

- Photoshop CC shows a warning dialog when the Move Tool tries to move Background; photoweb blocks the gesture without a modal because ordinary layer locks already behave as silent no-ops in photoweb.

## Stop Conditions

- Stop if persistence/history cannot round-trip Background state, if transparent documents regress, or if Background rules break existing normal layer operations.
