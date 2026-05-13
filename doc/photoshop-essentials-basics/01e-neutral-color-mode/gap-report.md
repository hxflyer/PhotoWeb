# gap-report — 01e-neutral-color-mode

## Lessons reviewed

- `remove-distractions-with-neutral-color-mode-in-photoshop-2022` — Photoshop 23.5 (August 2022) added a `Neutral Color Mode` checkbox to Preferences > Interface. When on, distracting accent colors in **static UI elements** (the blue Share button) are recoloured to neutral gray. The mode explicitly does NOT affect color-related interface elements like the Color Picker or Gradient Editor. No keyboard shortcut; no toolbar affordance; preference is persistent.

## Current photoweb coverage

- [src/components/Dialogs/PreferencesDialog.tsx](src/components/Dialogs/PreferencesDialog.tsx) already has an `Interface` section (added in 01a-interface-shell) hosting the four-thumbnail color-theme picker.
- [src/index.css:9-13](src/index.css#L9-L13) defines `--accent-primary: 210 50% 52%` (Photoshop selection blue), `--accent-secondary`, and `--accent-highlight: 210 100% 56%`. These tokens drive the blue highlight on active tool buttons, active panel tabs, active menu items, hover state on context-menu items, and dialog commit buttons.
- No `neutralColorMode` field anywhere in viewSlice. No app-level switch that swaps accent colors to neutral gray.

## Gaps

| # | Gap | Where |
|---|---|---|
| 1 | No `Neutral Color Mode` toggle in Preferences > Interface. | [PreferencesDialog.tsx](src/components/Dialogs/PreferencesDialog.tsx) — Interface section can grow one checkbox row. |
| 2 | No `neutralColorMode` state in viewSlice. | [viewSlice.ts](src/store/viewSlice.ts) + [types.ts](src/store/types.ts). |
| 3 | No CSS-variable swap when the mode is on. | [App.tsx](src/App.tsx) — same pattern as the `--pasteboard-bg` CSS-property override already in place. |

## Photoshop-habit mismatches

1. **Location**: Photoshop puts the checkbox in **Preferences > Interface**. photoweb's Preferences already has an Interface section since 01a — the checkbox slots in cleanly. Grounded in lesson body lines 17-32.
2. **Default**: Off (lesson body line 36).
3. **Label**: "Neutral Color Mode" — verbatim.
4. **Scope of effect**: photoshop neutralises *static* accent elements (blue Share button) but leaves *color-related* surfaces (Color Picker, Gradient Editor) alone (lesson body line 38). photoweb has no Share button, but our `--accent-primary` is the equivalent "static blue" — used for active tool/tab/menu highlights and dialog commit buttons. The Color Picker hue/saturation gradients and Swatches panel colors are image-data, not interface chrome — they are not driven by `--accent-primary`. Neutralising accents will not touch them. Grounded in same line.
5. **No restart required** (lesson body line 50). Photoweb's CSS-variable approach is live-applied.

## UI / UX issues separate from §4

- The four-thumbnail color theme picker added in 01a is a dropdown-free row. Adding the Neutral Color Mode checkbox below it as a single new row matches Photoshop's stacked Interface preferences layout.

## Photoshop divergences worth keeping

- **No Share button to recolour** (photoweb has no cloud-share feature; CLAUDE.md §4 excludes Creative Cloud). Neutral Color Mode's primary use case in Photoshop doesn't apply, but the toggle still has value for users who want neutral accent state for *any* photoweb chrome that today uses Photoshop's blue (active tabs, etc.). Log as a contextual divergence: same toggle, different elements it affects.
- **No global "static vs color-related" registry of CSS tokens** — neutralising is a blunt swap of `--accent-primary` + `--accent-highlight` to gray. The Color Picker happens to NOT use these tokens (it renders its own HSV/RGB gradients directly), so it's unaffected, matching Photoshop's behaviour. If a future widget incorrectly used `--accent-primary` for image data, that would need a different token. Defer to future need.
