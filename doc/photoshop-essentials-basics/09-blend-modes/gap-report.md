# 09 Blend Modes Gap Report

## Lessons Reviewed

- `preview-layer-blend-modes-photoshop-cc-2019` — Layers panel Blend Mode menu location, 27 modes, hover live preview, and Shift+Plus / Shift+Minus cycling.
- `blend-mode-tips-tricks` — Layer-vs-tool blend modes, Move/selection-tool shortcut context, common group shortcuts, and opacity as intensity control.
- `three-ways-to-blend-two-images-together-photoshop` — Opacity, layer blend modes, masks, and common recipes: Multiply, Screen, Overlay, Soft Light, Divide.

## Current Photoweb Coverage

- Photoweb already had a Layers panel blend mode control beside Opacity.
- Canvas native modes such as Multiply, Screen, Overlay, Soft Light, Hue, Saturation, Color, and Luminosity were usable where stored directly.
- Layer opacity was already supported and Background layers already blocked blend-mode changes.

## Gaps

- The mode list exposed 18 internal entries rather than Photoshop's 27 menu items.
- Custom Photoshop modes were collapsed to `source-over` in the Layers panel, so choosing Dissolve, Linear Burn, or Linear Dodge effectively selected Normal.
- `Layer.blendMode` used `GlobalCompositeOperation`, which could not represent Photoshop-only modes such as Vivid Light, Pin Light, Subtract, or Divide.
- The compositor assigned `globalCompositeOperation` directly and had no path for custom mode math.
- The Layers panel used a native select, so Photoshop CC 2019-style hover live preview was unavailable.
- Shift+Plus / Shift+Minus did not cycle layer blend modes.

## Photoshop-Habit Mismatches

- Photoshop users expect the menu order and separators to match the familiar Normal, Darken, Lighten, Contrast, Comparative, and Color groups.
- Hovering a menu item should preview without committing history.
- Clicking should commit one undoable layer-property change.
- Shift+Plus / Shift+Minus should cycle the active layer's mode from the Move Tool or selection tools, while paint tools keep their own blend-mode context.

## UI / UX Issues

- A native select could not expose hover preview reliably.
- The displayed options made some modes look selectable even though they stored Normal.
- Missing grouped modes hid common recipe workflows like Multiply for darkening, Screen for lightening, and Overlay / Soft Light for contrast.

## Photoshop Divergences Worth Keeping

- No deliberate user-facing divergence was introduced for this cluster.
