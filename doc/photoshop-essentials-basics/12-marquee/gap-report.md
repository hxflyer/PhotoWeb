# Gap Report — 12 Marquee

## Lessons reviewed
- `rectangular-marquee-tool` — Rectangular Marquee selection basics: `M`, drag rectangles, `Shift` square, `Alt/Option` from center, Space reposition, Options Bar Fixed Ratio / Fixed Size, and quick deselect.
- `elliptical-marquee-tool` — Elliptical Marquee parity with rectangular behavior: flyout access, `M` / `Shift+M`, oval/circle drawing, `Alt/Option` center drawing, Space reposition, feather, and anti-alias.
- `photoshop-selection-basics-the-rectangular-and-elliptical-marquee-tools` — Modern combined marquee workflow: toolbar group, HUD W/H readout, New/Add/Subtract/Intersect icons, fixed ratio/size with swap, feather and anti-alias options, crop/copy/mask examples, and geometric selection uses.

Key UI images inspected:
- `rectangular-marquee-tool/images/selections-rmt-marquee-tool-options-d5ca6854.gif` — legacy Options Bar showing Anti-alias disabled for rectangular, Style Fixed Ratio, Width/Height fields, and swap icon.
- `elliptical-marquee-tool/images/selections-emt-photoshop-options-bar-ff74cc31.gif` — Elliptical Options Bar with Anti-alias enabled by default and the same Style / Width / Height fields.
- `photoshop-selection-basics-the-rectangular-and-elliptical-marquee-tools/images/2022-rectangular-elliptical-marquee-tool-photoshop-marquee-selection-tools-12f3d2c9.png` — toolbar flyout listing Rectangular, Elliptical, Single Row, and Single Column marquee tools.
- `photoshop-selection-basics-the-rectangular-and-elliptical-marquee-tools/images/2022-rectangular-elliptical-marquee-tool-marquee-selection-tools-keyboard-shortcut-5cb45cfd.png` — `M` shortcut shown for Rectangular and Elliptical Marquee.
- `photoshop-selection-basics-the-rectangular-and-elliptical-marquee-tools/images/2022-rectangular-elliptical-marquee-tool-draw-rectangular-selection-outline-30f8ddcb.png` — live marching-ants rectangle with HUD W/H.
- `photoshop-selection-basics-the-rectangular-and-elliptical-marquee-tools/images/2022-rectangular-elliptical-marquee-tool-move-rectangular-selection-outline-dde3af99.png` — dragging inside an existing outline moves the outline, not pixels.
- `photoshop-selection-basics-the-rectangular-and-elliptical-marquee-tools/images/2022-rectangular-elliptical-marquee-tool-style-fixed-ratio-98e3974f.png` and `2022-rectangular-elliptical-marquee-tool-fixed-ratio-swap-icon-3bfe31d0.png` — Fixed Ratio fields and swap icon.
- `photoshop-selection-basics-the-rectangular-and-elliptical-marquee-tools/images/2022-rectangular-elliptical-marquee-tool-selection-style-fixed-size-6df68d94.png` and `2022-rectangular-elliptical-marquee-tool-draw-rectangular-selection-fixed-size-cf9fabb4.png` — Fixed Size fields and click-to-place behavior.
- `photoshop-selection-basics-the-rectangular-and-elliptical-marquee-tools/images/2022-rectangular-elliptical-marquee-tool-elliptical-marquee-tool-antialias-option-a54bebab.png` — Elliptical Anti-alias checkbox on by default.
- `photoshop-selection-basics-the-rectangular-and-elliptical-marquee-tools/images/2022-rectangular-elliptical-marquee-tool-heads-up-display-89b66d87.jpg` — HUD showing W/H while drawing.

## Current photoweb coverage
- Tool registration includes `marquee-rect` and `marquee-ellipse`, both with a crosshair cursor and overlay rendering: [marquee.ts](../../../src/tools/marquee.ts#L159).
- `computeMarqueeRect` supports Normal drag, `Shift` square/circle constraint, and `Alt/Option` center drawing: [marquee.ts](../../../src/tools/marquee.ts#L38).
- Clicking outside an existing selection clears it; dragging inside with a marquee tool moves the selection outline instead of pixels: [marquee.ts](../../../src/tools/marquee.ts#L174).
- Selection operation modifiers from 11a are active for marquee tools: `Shift` add, `Alt/Option` subtract, and `Shift+Alt/Option` intersect are captured at pointer-down: [marquee.ts](../../../src/tools/marquee.ts#L168), [selectionModifiers.ts](../../../src/tools/selectionModifiers.ts#L30).
- Options Bar exposes New/Add/Subtract/Intersect, Feather, Elliptical Anti-alias, and a Style dropdown shell: [OptionsBar.tsx](../../../src/components/Panels/OptionsBar.tsx#L297).
- App-level tool shortcuts include the marquee group under `M`, respecting `Use Shift Key For Tool Switch`: [App.tsx](../../../src/App.tsx#L589).
- Tests cover basic rectangular marquee creation, moving existing selection outlines, `Shift` square, `Alt` center, operation modifiers, `Shift+M`, feather storage, and ellipse anti-alias masks: [selection.test.ts](../../../src/test/selection.test.ts#L62), [toolShortcuts.test.tsx](../../../src/test/toolShortcuts.test.tsx#L44), [marqueeFeather.test.ts](../../../src/test/marqueeFeather.test.ts#L31).

## Gaps
- The Options Bar `Style` dropdown is not wired to tool behavior, and there are no Width/Height fields or ratio swap button.
- Fixed Ratio selections are missing for both rectangular and elliptical marquee tools.
- Fixed Size click-to-place and click-drag-to-reposition behavior is missing.
- Spacebar repositioning while drawing a new marquee is missing. The global temporary Hand Tool can steal Space during a marquee gesture.
- The live marquee overlay does not show a W/H HUD like the lesson screenshots.

## Photoshop-habit mismatches
- `2022-rectangular-elliptical-marquee-tool-selection-tool-style-80607183.png`, `2022-rectangular-elliptical-marquee-tool-style-fixed-ratio-98e3974f.png`, and `2022-rectangular-elliptical-marquee-tool-selection-style-fixed-size-6df68d94.png` show Style as a real Options Bar contract; photoweb shows the menu but ignores it.
- `2022-rectangular-elliptical-marquee-tool-fixed-ratio-swap-icon-3bfe31d0.png` shows the swap icon between Width and Height; photoweb has no ratio/size swap affordance.
- `rectangular-marquee-tool` and `elliptical-marquee-tool` both stress that Space repositions the outline mid-drag; photoweb currently only supports moving a completed selection outline.
- `2022-rectangular-elliptical-marquee-tool-heads-up-display-89b66d87.jpg` shows live W/H feedback; photoweb draws marching ants without dimensions.

## UI / UX issues
- Width/Height cannot be inspected or entered from the marquee Options Bar, making Fixed Ratio and Fixed Size impossible to use from the UI.
- Holding Space during a marquee drag risks switching the active tool to Hand, which breaks the Photoshop mid-gesture reposition habit.

## Photoshop divergences worth keeping
- Single Row Marquee Tool and Single Column Marquee Tool stay out of scope for this tick. They appear in the Photoshop flyout, but the selected cluster is explicitly rectangular/elliptical marquee and photoweb has no one-pixel row/column selection tool slot yet.
