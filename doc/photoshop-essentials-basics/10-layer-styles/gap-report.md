# 10 Layer Styles Gap Report

## Lessons Reviewed

- `using-layer-effects-and-layer-styles-in-photoshop-cc-2020-complete-guide` — Layer Style dialog, `fx` entry points, ten effects, Styles panel, effect visibility/editability, scaling, and preset workflows.
- `saving-layer-styles` — New Style, Include Layer Effects, Include Layer Blending Options, applying saved styles from the Styles panel, and clearing/reusing saved styles.
- `opacity-vs-fill` — Opacity attenuates layer pixels and effects together; Fill attenuates layer pixels while keeping effects fully visible.

## Current Photoweb Coverage

- Photoweb already had all ten layer-effect renderers registered: Drop Shadow, Inner Shadow, Outer/Inner Glow, Bevel & Emboss, Satin, Color/Gradient/Pattern Overlay, Pattern Overlay, and Stroke.
- The Layer Style dialog already exposed Blending Options plus effect tabs.
- Properties already offered Copy Layer Style, Paste Layer Style, Clear Layer Style, and Scale Effects.
- Fill Opacity was already correct for drawable layers with effects.

## Gaps

- The Layers panel bottom toolbar did not have Photoshop's `fx` layer-style entry point.
- `Layer > Layer Style` exposed Copy/Paste/Clear/Scale but not Blending Options or the ten effect commands.
- Double-clicking an existing `fx` badge opened a non-existent `effects` tab, leaving the dialog body blank.
- Background layers could still receive effects through store-level calls.
- There was no `New Style...` flow in the Layer Style dialog and no Styles panel for saved style presets.
- Effect rendering followed insertion order instead of a stable Photoshop-like effect stack.
- Group Fill with effects attenuated the final effect scratch instead of only the group's pixel contents.

## Photoshop-Habit Mismatches

- Photoshop users expect both bottom `fx` and Layer > Layer Style to open the same modal effect workflow.
- Photoshop users expect Background-layer style entries to be unavailable.
- Saving a style should optionally include layer effects and optionally include blending options.
- Saved styles should be reusable from Window > Styles.

## UI / UX Issues

- The existing dialog could only be reached through row/context interactions, not the bottom toolbar.
- Saved style reuse was limited to copy/paste between currently open layers.
- The Styles panel was absent from the panel dock and Window menu.

## Photoshop Divergences Worth Keeping

- Saved layer styles are stored in browser localStorage rather than Photoshop `.asl` files or Preset Manager sets.
- The Styles panel uses compact text thumbnails rather than Photoshop's rich rendered thumbnails and folder sets.
