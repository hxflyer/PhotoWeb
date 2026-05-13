# 22a Gradient Tool And Editor Gap Report

Cluster: `22a-gradient-tool-and-editor`

## Lessons Reviewed

- `how-to-draw-gradients-with-the-gradient-tool-in-photoshop` — Gradient Tool `G`, Options Bar preset picker, Reverse/Dither/Transparency, five gradient styles, drag-to-draw line, Shift 45-degree constraint, foreground/background preset semantics.
- `how-to-use-the-gradient-editor-in-photoshop` — Gradient Editor opens from the Options Bar preview, edits color/opacity stops, midpoint diamonds, locations, smoothness, and saves presets.
- `how-to-create-a-rainbow-gradient-in-photoshop` — Builds a rainbow from Black, White using red/yellow/green/cyan/blue/magenta stops at 0/20/40/60/80/100%, then saves it as a preset.

## Current Photoweb Coverage

- Gradient Tool already supported `linear`, `radial`, `angle`, `reflected`, `diamond`, Reverse, Dither, Transparency, Opacity, Mode, Smooth/Classic, selection clipping, Shift angle constraint, live handles, Enter commit, and Esc cancel in [gradient.ts](../../../src/tools/gradient.ts#L7).
- Options Bar already exposed the gradient preset selector, preview, edit button, type buttons, Mode, Opacity, Reverse, Dither, Transparency, and Method in [OptionsBar.tsx](../../../src/components/Panels/OptionsBar.tsx#L1310).
- Gradient Editor already supported adding/moving/deleting color stops, opacity stops, midpoint diamonds, color picker editing, smoothness, and local saved presets in [GradientEditorDialog.tsx](../../../src/components/Dialogs/GradientEditorDialog.tsx#L159).
- Existing tests covered editor stop manipulation, midpoint/smoothness, several tool render paths, selection clipping, undo/redo, and live handles.

## Gaps

- Custom Gradient Editor stops were saved to `options.stops` but the tool renderer ignored them and always rendered the selected built-in preset.
- Options Bar preview also ignored custom stops.
- `Black, White` incorrectly inherited current foreground/background colors; Photoshop's Black, White preset should remain fixed black-to-white.
- `Foreground to Transparent` used foreground/background endpoint substitution even though Photoshop's preset should use foreground color fading to transparent.
- Independent opacity stops from the editor were collapsed to color-stop positions, so opacity-only stops could be lost at paint time.
- Dither default was off, while the lesson shows Dither enabled in the Options Bar.
- The rainbow recipe was not available as a ready preset for verification and repeated use.

## Photoshop-Habit Mismatches

- Clicking the preview bar opens the Gradient Editor, grounded by `2020-rainbow-gradient-open-gradient-editor-082c08f4.png`; photoweb opened the editor but its result did not affect painting.
- The Gradient Picker / Options Bar preview should show the active gradient, grounded by `gradients-essentials-gradient-preview-new-colors-bc8b52cd.jpg`; photoweb preview stayed on the selected preset after custom edits.
- `Black, White` should ignore current foreground/background colors, grounded by `2020-rainbow-gradient-choose-black-white-gradient-8fd7e869.png`.
- `Foreground to Transparent` is a foreground-color alpha ramp, grounded by the gradient drawing lesson's foreground-transparent examples.
- The rainbow lesson specifies stops at 0%, 20%, 40%, 60%, 80%, and 100%, grounded by `2020-rainbow-gradient-red-color-location-0percent-a0c95934.jpg`, `2020-rainbow-gradient-set-yellow-location-20percent-2b34d5e3.jpg`, `2020-rainbow-gradient-green-color-location-40-232d9553.jpg`, `2020-rainbow-gradient-cyan-color-location-60percent-fdc65d92.jpg`, `2020-rainbow-gradient-blue-location-80-percent-60d9aa4d.jpg`, and `2020-rainbow-gradient-magenta-location-100percent-70633640.jpg`.

## UI / UX Issues

- The preview swatch was visually stale after editor commits.
- Changing the preset dropdown after a custom edit left the custom stops active, so the visible preset selector and rendered gradient could disagree.

## Implemented Work

- The Gradient Tool now renders custom color stops and independent opacity stops from the Gradient Editor.
- Options Bar preview now reflects custom stops and preset selection clears stale custom stops.
- Added fixed preset semantics for `Black, White`, `Foreground to Background`, and `Foreground to Transparent`.
- Added `Rainbow` built-in preset with the lesson's stop colors and locations.
- Changed default Dither to on.
- Added `resetGradientOptions()` for stable default-option tests.

## Verification

- Focused:
  - `npx tsc -b`
  - `npx vitest run src/test/gradientOptions.test.ts src/test/gradientEditor.test.tsx`
  - `npx vitest run src/test/gradientOptions.test.ts src/test/gradientEditor.test.tsx src/test/fillTools.test.ts src/test/liveGradientSliceI.test.ts`
- Full:
  - `npx tsc -b`
  - `npm run lint` — 16 existing warnings, 0 errors.
  - `npm test` — 166 files / 1247 tests.
  - Dev server smoke test: `curl -I http://127.0.0.1:5173/` returned `200 OK`.

## Photoshop Divergences Worth Keeping

- Photoweb stores saved gradients in the Gradient Editor's browser-local preset row rather than Photoshop's full Gradients panel group/file workflow.
- Photoshop's Gradient Editor includes Noise gradients; photoweb keeps this cluster focused on Solid gradients because the renderer and lessons' main workflow use solid color/opacity stops.
