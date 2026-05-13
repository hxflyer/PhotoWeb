# Plan — 12 Marquee

## Goals

### Feature spec: Options Bar Style controls drive marquee geometry

**What it does** — The Rectangular and Elliptical Marquee tools use the Options Bar `Style` menu, Width and Height fields, and swap button to draw Normal, Fixed Ratio, or Fixed Size selections. The same controls apply to both shapes; Elliptical keeps Anti-alias on by default.

**Photoshop habit preserved** — `photoshop-selection-basics-the-rectangular-and-elliptical-marquee-tools/images/2022-rectangular-elliptical-marquee-tool-selection-tool-style-80607183.png`, `2022-rectangular-elliptical-marquee-tool-style-fixed-ratio-98e3974f.png`, `2022-rectangular-elliptical-marquee-tool-fixed-ratio-swap-icon-3bfe31d0.png`, and `2022-rectangular-elliptical-marquee-tool-selection-style-fixed-size-6df68d94.png` show Style, W/H fields, and swap as sticky Options Bar controls.

**Invocation** — Select Rectangular or Elliptical Marquee from the toolbar/flyout or `M` / `Shift+M`; choose `Normal`, `Fixed Ratio`, or `Fixed Size` in the Options Bar; edit W/H; click the swap icon.

**Pre-conditions** — A document is open and a marquee tool is active. Fixed Ratio requires W and H greater than zero; Fixed Size clamps W and H to at least 1 px.

**Interaction choreography**
1. User selects a marquee tool; the cursor is the crosshair.
2. In Normal style, drag freely. `Shift` after mouse-down constrains to square/circle, `Alt/Option` after mouse-down draws from center, and `Shift+Alt/Option` combines both.
3. In Fixed Ratio style, drag from a corner; the outline keeps the W:H ratio. `Alt/Option` draws the ratio-locked outline from center.
4. In Fixed Size style, click and release to place an exact-size outline; click-drag before release repositions the exact-size outline.
5. Clicking the swap icon exchanges W and H and affects the next drag.

**Visual feedback** — The marching-ants overlay matches `2022-rectangular-elliptical-marquee-tool-draw-rectangular-selection-fixed-ratio-dfd2081f.png` and `2022-rectangular-elliptical-marquee-tool-draw-rectangular-selection-fixed-size-cf9fabb4.png`.

**Post-conditions** — Mouse-up commits one selection operation using the currently resolved New/Add/Subtract/Intersect mode. The style settings remain sticky until changed, matching Photoshop.

**Edge cases** — Zero or invalid numeric input clamps to 1. Shift held before mouse-down still means Add to Selection because selection-operation modifiers are resolved at pointer-down; Shift pressed after the drag starts constrains only Normal style geometry.

### Feature spec: Spacebar mid-drag reposition and HUD

**What it does** — While drawing a new marquee, pressing Space freezes the current size and lets the user move the outline. Releasing Space resumes resizing. The live overlay displays a small W/H HUD next to the active corner.

**Photoshop habit preserved** — `rectangular-marquee-tool` and `elliptical-marquee-tool` both describe holding Space to reposition mid-draw; `photoshop-selection-basics-the-rectangular-and-elliptical-marquee-tools/images/2022-rectangular-elliptical-marquee-tool-heads-up-display-89b66d87.jpg` shows the W/H HUD.

**Invocation** — Begin dragging with Rectangular or Elliptical Marquee, press and hold Space, move the mouse, release Space, continue dragging, then release the mouse.

**Pre-conditions** — A marquee drag is already in progress. Space outside an active marquee drag continues to invoke the temporary Hand Tool.

**Interaction choreography**
1. User presses mouse down and drags; marching ants preview the selection.
2. User presses Space while the mouse is still down; the cursor remains in the marquee gesture and the active tool does not switch to Hand.
3. Mouse movement with Space held translates the outline without changing W/H.
4. User releases Space; subsequent movement resizes from the repositioned anchor/current points.
5. HUD follows the active outline and reports rounded `W` and `H` in pixels until mouse-up.

**Visual feedback** — The live outline and HUD mimic `2022-rectangular-elliptical-marquee-tool-move-rectangular-selection-outline-dde3af99.png` and `2022-rectangular-elliptical-marquee-tool-heads-up-display-89b66d87.jpg`.

**Post-conditions** — Mouse-up commits the final repositioned geometry as a single selection history action. Space release after commit no longer affects the marquee state.

**Edge cases** — If Space is pressed without an active marquee drag, temporary Hand Tool behavior remains unchanged. If the user releases Space before mouse-up, the size resumes changing from the translated geometry.

## Out-of-scope-this-tick
- Single Row and Single Column Marquee tools are deferred; the cluster is rectangular/elliptical and adding one-pixel tool modes needs toolbar, cursor, and selection-mask decisions of its own.
- Post-selection Properties panel Feather workflows and layer-mask examples are deferred to edge-refinement and layer-mask clusters.

## Files to edit / files to create
- `src/tools/marquee.ts` — add style options, fixed ratio/size geometry, Space drag state, HUD overlay, and gesture-active export.
- `src/components/Panels/OptionsBar.tsx` — wire Style/W/H/swap controls and expose stable test IDs.
- `src/App.tsx` — keep temporary Hand from stealing Space during an active marquee gesture.
- `src/test/12-marquee.test.tsx` — simulator/store tests for Options Bar wiring, fixed ratio, fixed size, Space reposition, and Space/Hand suppression.
- `doc/photoshop-essentials-basics/12-marquee/gap-report.md` and `plan.md` — cluster artifacts.
- `doc/photoshop-essentials-basics/divergence-log.md` — record Single Row/Column deferral.

## Test cases
- Options Bar `Fixed Ratio` plus W/H fields makes the next rectangular marquee commit at that ratio, and the swap button flips the ratio.
- Fixed Size click-and-release commits the exact requested W/H rectangle.
- Fixed Size click-drag repositions the exact-size rectangle before commit.
- Space held during a normal marquee drag moves the outline without changing W/H.
- App-level Space does not activate the Hand Tool while a marquee drag is active.
- Existing `Shift+M`, `Shift` square/circle, `Alt/Option` center, Add/Subtract/Intersect, feather, and anti-alias tests remain green.

## Divergences from Photoshop
- Photoshop exposes Single Row Marquee Tool and Single Column Marquee Tool in the flyout; photoweb continues to omit them in this tick because the current cluster scope and tool registry cover rectangular/elliptical geometry only.

## Stop conditions specific to this cluster
- Stop if Space-drag requires replacing the App temporary navigation architecture.
- Stop if fixed-size behavior needs a modal/unit parser beyond numeric pixel values.
- Stop if tests would need to skip or weaken existing marquee modifier assertions.
