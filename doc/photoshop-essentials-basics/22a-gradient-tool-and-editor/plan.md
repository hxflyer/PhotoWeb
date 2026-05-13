# 22a Gradient Tool And Editor Plan

## Goals

### Feature: Edited Gradients Render Correctly

**What it does** — Gradients edited in the Gradient Editor become the actual gradient used by the Gradient Tool, including color stops, opacity stops, midpoint metadata, smoothness, reverse, transparency, and the Options Bar preview.

**Photoshop habit preserved** — Clicking the Options Bar gradient preview opens the Gradient Editor, and committing the editor changes the active gradient used by the tool, grounded by `how-to-use-the-gradient-editor-in-photoshop` and `gradients-gradient-editor-gradient-bar-cc58c581.jpg`.

**Invocation** — Select Gradient Tool with `G`, click the Options Bar gradient preview/edit control, edit stops, click `OK`, then drag on the canvas.

**Pre-conditions** — A document with an editable active layer is needed to paint. The editor can open without painting.

**Interaction choreography** — The user edits stops in the dialog, clicks `OK`, sees the Options Bar preview update, clicks and drags on the canvas, optionally holds Shift to constrain angle, releases to preview the gradient, and presses Enter or changes tool to commit the single history entry.

**Visual feedback** — The preview swatch updates immediately after `OK`, grounded by `gradients-essentials-gradient-preview-new-colors-bc8b52cd.jpg`; canvas pixels match the edited colors/alpha after release.

**Post-conditions** — The active layer shows the edited gradient and undo restores the pre-stroke snapshot.

**Edge cases** — Opacity-only stops remain active even when no color stop shares their location. Selecting a built-in preset clears custom stops so the selector and preview cannot disagree.

### Feature: Photoshop Preset Semantics

**What it does** — Built-in presets behave like Photoshop: Foreground to Background uses current foreground/background colors, Foreground to Transparent uses foreground color with alpha falloff, and Black, White stays fixed black-to-white.

**Photoshop habit preserved** — Preset semantics match the gradient drawing lesson, grounded by `gradients-essentials-selecting-foreground-to-background-gradient-b10932b4.jpg`, the foreground-transparent examples, and `2020-rainbow-gradient-choose-black-white-gradient-8fd7e869.png`.

**Invocation** — Pick a preset from the Gradient Tool Options Bar and draw normally.

**Pre-conditions** — Gradient Tool active; foreground/background colors matter only for the first two Photoshop-dynamic presets.

**Interaction choreography** — Select preset, drag a gradient line, release, and Enter commits the preview. Changing foreground/background before drawing updates only dynamic presets.

**Visual feedback** — Fixed presets render fixed colors; dynamic presets update the preview with current foreground/background colors.

**Post-conditions** — One gradient history entry is committed.

**Edge cases** — Reverse still flips positions after the preset colors are resolved. Transparency off forces alpha stops opaque.

### Feature: Rainbow Recipe Preset

**What it does** — The rainbow recipe is available as a built-in preset with red, yellow, green, cyan, blue, and magenta at 0%, 20%, 40%, 60%, 80%, and 100%.

**Photoshop habit preserved** — The stop colors and locations match `how-to-create-a-rainbow-gradient-in-photoshop`, grounded by its per-color location screenshots.

**Invocation** — Choose `Rainbow` from the Gradient Tool preset selector or use it as a starting preset in the Gradient Editor.

**Pre-conditions** — None beyond Gradient Tool/editor availability.

**Interaction choreography** — Select `Rainbow`, draw or edit like any other solid gradient.

**Visual feedback** — The Options Bar preview and canvas show the six-color rainbow ramp.

**Post-conditions** — The preset remains available without rebuilding the recipe by hand.

**Edge cases** — Reverse flips the rainbow order; Transparency has no visible effect because all rainbow stops are opaque.

## Out-Of-Scope This Tick

- Full Photoshop Gradients panel groups, panel menu append/reset sets, and drag/drop to text/image as fill layer or Gradient Overlay.
- Noise gradient type.
- Alt/Option-drag duplicate and drag-away-delete stop gestures; Delete key removal and Save/apply presets already exist.

## Files To Edit / Files To Create

- `src/tools/gradient.ts` — preset semantics, default dither, custom stop rendering, independent opacity stops, rainbow preset.
- `src/components/Panels/OptionsBar.tsx` — custom preview, preserve opacity stops, clear custom stops on built-in preset selection.
- `src/test/gradientOptions.test.ts` — simulator render regressions and preset semantics.
- `src/test/gradientEditor.test.tsx` — Options Bar preview/custom clearing regression.

## Test Cases

- Default gradient options have Dither enabled.
- Rainbow preset has the lesson's six colors and exact stop locations.
- Black, White ignores current foreground/background colors.
- Custom editor stops render through the Gradient Tool, verified by sampled canvas pixels.
- Opacity-only editor stops survive render and affect alpha.
- Options Bar preview reflects custom stops and selecting a built-in preset clears custom stops.

## Divergences From Photoshop

- Photoshop has a full Gradients panel with groups and drag/drop; photoweb keeps saved gradients in the editor's browser-local preset row because a full Gradients panel belongs to a broader presets-panel pass.
- Photoshop's Gradient Editor supports Noise gradients; photoweb implements Solid gradients because current rendering and this cluster's practical drawing flow are solid-stop based.

## Stop Conditions Specific To This Cluster

- Stop if preserving independent opacity stops requires replacing the existing `GradientStop` renderer contract.
- Stop if implementing the full Gradients panel would exceed this cluster's file-edit budget.
