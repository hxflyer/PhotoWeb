# Photoweb vs. Photoshop UX Gap Report

Compiled 2026-05-11 from 5 parallel research agents that compared each photoweb tool/dialog/shortcut against authoritative Photoshop documentation (helpx.adobe.com, jkost.com, photoshopessentials, photoshoptrainingchannel). Every entry below is anchored to a source URL plus a photoweb file path and a one-line suggested fix. This file is the **fix list** that drives the implementation slices that follow.

Status legend:
- `P0` — blocks core photoshop muscle-memory or violates the CLAUDE.md history invariant
- `P1` — significant UX gap; pro users will notice
- `P2` — polish

## Slice index

Each finding maps to an implementation slice tag so the backlog stays organized.

| Slice | Theme | Files |
|---|---|---|
| `A` | Global keyboard / spacebar Hand / fullscreen | `App.tsx`, `Viewport.tsx` |
| `B` | Move tool: Alt-duplicate, Shift-constrain, Auto-Select | `move.ts`, `OptionsBar.tsx` |
| `C` | Paint family modifiers (brush/pencil/eraser) | `brush.ts`, `pencil.ts`, `eraser.ts`, `Viewport.tsx` |
| `D` | Dodge/Burn/Sponge history + Alt-swap | `dodgeBurnSponge.ts` |
| `E` | Free Transform Shift/Alt/rotate-snap/outside-bbox-rotate | `FreeTransformOverlay.tsx` |
| `F` | Crop tool: aspect, Shift/Alt, deleteCroppedPixels | `crop.ts`, `OptionsBar.tsx` |
| `G` | Type tool commit/select/Cmd+A/anti-alias | `type.ts`, `TextEditOverlay.tsx`, `CharacterPanel.tsx` |
| `H` | Color Range eyedropper + Refine Edge live preview | `ColorRangeDialog.tsx`, `RefineEdgeDialog.tsx` |
| `I` | Clone Stamp source ghost, Gradient live handles | `cloneStamp.ts`, `gradient.ts` |
| `J` | Vector tool option-bar wiring, Pen Auto Add/Delete + Rubber Band | `pen.ts`, `pathSelection.ts`, `shapes.ts`, `OptionsBar.tsx` |
| `K` | Polish, P2s, deferred items | various |

---

## Slice A — Global keyboard & viewport

### A1 `P0` Spacebar temporary Hand tool — missing
Press-and-hold Space activates Hand for pan even mid-stroke; release returns to prior tool. Photoweb has no Space handler in `App.tsx`/`Viewport.tsx`. Fix in `App.tsx` global key handler with a tool-stack push/pop.
Source: https://helpx.adobe.com/photoshop/using/tool-techniques/hand-tool.html

### A2 `P1` Cmd+J / Cmd+Shift+J — Layer via Copy / Cut not wired
`MenuBar` shows ⌘J but `App.tsx` has no `key === 'j'` branch. With selection: layer via copy/cut; without: duplicate.
Source: https://photoshoptrainingchannel.com/tips/new-layer-via-copy-shortcut-selections/

### A3 `P1` Cmd+G / Cmd+Shift+G — group / ungroup not bound globally
Source: https://jkost.com/blog/2017/08/shortcuts-for-working-with-layer-groups-in-photoshop-cc.html

### A4 `P1` Cmd+E / Cmd+Shift+E / Cmd+Alt+Shift+E — Merge Down / Visible / Stamp
Store actions exist; only menu wired.

### A5 `P1` Cmd+1 — 100% zoom not bound
`App.tsx` handles Cmd+0 (fit) only.

### A6 `P1` F (cycle fullscreen modes) not bound; no screenMode state in store.

### A7 `P2` Cmd+scroll zoom / Shift+scroll horizontal pan not honored
`handleWheel` only branches on `e.ctrlKey`.

---

## Slice B — Move tool

### B1 `P0` Auto-Select checkbox is decorative
`OptionsBar` renders the dropdown with no `value`/`onChange`. `moveTool.onPointerDown` never hit-tests layers.
Source: https://www.bwillcreative.com/the-move-tool-in-photoshop/

### B2 `P0` Alt-drag duplicate missing
`moveTool.onPointerDown` ignores `e.alt`.

### B3 `P0` Shift-drag does not constrain to H/V/45°
`onPointerMove` never reads `e.shift`.
Source: https://shapeshed.com/photoshop-101-the-move-tool/

### B4 `P2` Cmd-click temporary Auto-Select when off — missing

### B5 `P1` "Show Transform Controls" checkbox non-functional

---

## Slice C — Paint family modifiers

### C1 `P0` Shift+click straight line stroke (brush/pencil/eraser)
No "last point" retained across strokes.
Source: https://shotkit.com/brush-size-photoshop/

### C2 `P0` Number keys do not set opacity; Shift+number for flow missing
1–9 = 10–90%, 0 = 100%; double-digit window ~300ms.
Source: https://medium.com/@radigoj/101-all-photoshop-brush-shortcuts-b36a9b10586f

### C3 `P0` No on-canvas brush preview circle; no Caps Lock toggle
All paint tools declare `cursor: 'crosshair'`; no overlay.
Source: https://www.photoshopessentials.com/basics/photoshop-brush-tool-hidden-tips-tricks/

### C4 `P0` Alt-hold does not temporarily activate Eyedropper
Source: https://community.adobe.com/t5/photoshop-ecosystem-discussions/when-using-brush-then-option-to-select-colour/m-p/13892318

### C5 `P1` Mouse pressure defaults to 0.5
`Viewport.tsx` `native?.pressure ?? 0.5` halves mouse-driven brushes silently when `pressureSize` is on. Fix: gate on `pointerType === 'pen'`; else 1.0.

### C6 `P1` Comma/period to cycle brush presets — not bound

### C7 `P2` Alt+right-drag HUD resize — not implemented

---

## Slice D — Dodge/Burn/Sponge

### D1 `P0` (invariant violation) No history commit per stroke
`dodgeBurnSponge.ts` writes to layer.ctx directly with no `captureLayerRegion` / pixel history. Violates the CLAUDE.md "every pixel-mutating action goes through history" invariant.
Source: https://helpx.adobe.com/photoshop/using/tool-techniques/dodge-tool.html

### D2 `P0` Alt does not toggle Dodge ⇄ Burn during stroke
Source: https://helpx.adobe.com/photoshop/desktop/repair-retouch/adjust-light-tone/dodge-or-burn-image-areas.html

### D3 `P1` No "Protect Tones" option

---

## Slice E — Free Transform

### E1 `P0` Shift does not constrain proportions, Alt does not scale from center
`FreeTransformOverlay.tsx` never reads `e.shiftKey`/`e.altKey`.
Source: https://helpx.adobe.com/photoshop/using/free-transformations-images-shapes-paths.html

### E2 `P0` No modifier-driven distort / skew / perspective
Cmd-drag corner = distort; Cmd+Shift-drag side = skew; Cmd+Alt+Shift corner = perspective. Overlay supports only axis-aligned scale + rotate around center.

### E3 `P0` Rotate by dragging outside bbox — no hit zone
Only the small handle above the top edge can rotate.

### E4 `P1` Right-click context menu missing (Rotate 180 / 90 CW/CCW, Flip H/V)

### E5 `P1` Transform Again (Cmd+Shift+T) maps to Warp in photoweb; should re-apply last transform

### E6 `P1` Numeric W/H chain-link missing

### E7 `P1` Rotation drag ignores Shift (no 15° snap)

---

## Slice F — Crop tool

### F1 `P0` `deleteCroppedPixels` flag is read by UI but `applyCrop` always shrinks the layer canvas

### F2 `P0` Aspect-ratio dropdown is `<select>` with no `value`/`onChange`. `aspectRatio()` is never called in `resizeFromHandle`.

### F3 `P0` Shift / Alt modifiers ignored when resizing the crop rect

### F4 `P0` Cannot rotate the crop by dragging outside corners

### F5 `P1` Shift+O does not toggle overlay orientation

---

## Slice G — Type tool

### G1 `P0` Numpad Enter does not commit (only Cmd+Enter does)
Source: https://jkost.com/blog/2020/09/30-tips-tricks-and-shortcuts-for-working-with-type-in-photoshop.html

### G2 `P0` Switching to another tool while editing does NOT commit text — layer pixels stay cleared
`setTool` is not wired to `commitActiveEditingType`.

### G3 `P0` Cmd+A inside an open type edit dispatches the document-wide Select-All instead of selecting all characters
`App.tsx` `meta && key === 'a'` runs above the contenteditable bail-out.

### G4 `P0` Double-click on a type layer does not select the word under cursor
Triple/quadruple click for line/paragraph also missing.

### G5 `P0` Layers panel double-click on a "T" thumbnail does not enter Type edit + Select All

### G6 `P0` Anti-alias dropdown is hardcoded to "Sharp" and disabled
No `antiAlias` field on `TextStyle`.

### G7 `P0` Kerning has no Optical or numeric mode
Only "Metrics" placeholder. `TextStyle` has no `kerning` field.

### G8 `P1` No size/leading/kerning/tracking keyboard shortcuts inside the overlay

### G9 `P1` Warp Text dialog/feature missing entirely (Cmd+Shift+T runs pixel warp)

### G10 `P1` Properties Type section has no "Create Work Path" button

### G11 `P1` Esc does not fully restore the original text content (deep-clone snapshot missing)

---

## Slice H — Color Range / Refine Edge

### H1 `P0` Color Range — no on-canvas eyedropper sampling
`ColorRangeDialog` only ships an `<input type=color>`.
Source: https://helpx.adobe.com/photoshop/desktop/make-selections/freehand-selections/select-a-color-range-in-photoshop.html

### H2 `P0` Refine Edge view modes have no on-canvas effect
`viewMode` stored as local state but never read.

### H3 `P1` Color Range `Select` preset dropdown (Sampled / Reds / Yellows / Skin Tones / Highlights / Midtones / Shadows / Out of Gamut) — missing

### H4 `P1` Color Range Selection Preview dropdown (None / Grayscale / Black Matte / White Matte / Quick Mask) — missing

### H5 `P1` Select and Mask "New Layer" / "New Document" outputs + Decontaminate Colors — missing

### H6 `P1` Modify > Expand / Contract menu entries disabled despite store actions existing

### H7 `P1` Save Selection Operation radio group + Load Selection Invert toggle — missing

### H8 `P1` Cmd+Shift+D Reselect, Cmd+H Hide Selection Edges — not wired

---

## Slice I — Clone Stamp ghost overlay & Live Gradient

### I1 `P0` Clone Stamp source overlay just draws a marker glyph; no translucent ghost of the sampled image patch under the brush
`cloneStamp.ts renderCloneStampOverlay` calls `drawStampMarker` only.
Source: https://helpx.adobe.com/photoshop/desktop/repair-retouch/heal-clone/adjust-the-sample-source-overlay-options.html

### I2 `P0` Gradient — no interactive on-canvas handles after release (Live Gradient 2023+)
Gradient commits immediately on pointer-up; no editable endpoints/stops.

### I3 `P1` Healing brush Source picker (Sampled / Pattern) + Diffusion — missing

### I4 `P1` Patch tool drag-from-clean-area workflow + Transparent/Diffusion options — missing

### I5 `P0` Spot healing — Create Texture branch is no-op (Content-Aware is correctly out-of-scope)

### I6 `P1` Background Eraser tolerance is 0–255 raw; should be 0–100% in UI

---

## Slice J — Vector tools

### J1 `P1` Pen — no Auto Add/Delete toggle in options bar
### J2 `P1` Pen — no Rubber Band toggle
### J3 `P1` Pen — Alt-drag from existing anchor produces mirrored handles; PS Convert Anchor Point breaks symmetry (cusp)
### J4 `P1` Direct Selection — Backspace/Delete does not delete anchors
### J5 `P1` Path Selection — Delete does not remove the whole path
### J6 `P1` Path Selection — no marquee box-select
### J7 `P1` Shape Options Bar Fill / Stroke / Width / W / H — non-functional placeholders
### J8 `P1` Shape Combine ops only tag the next shape; no actual boolean geometry
### J9 `P1` Polygon — Indent Sides By %, Smooth Corners, Smooth Indents missing
### J10 `P1` Line — Arrow Width / Length / Concavity missing
### J11 `P1` Paths panel — Make Selection from Path / Make Work Path from Selection buttons missing
### J12 `P2` Stroke Path dialog — Tool picker + Simulate Pressure missing
### J13 `P2` Fill Path dialog — Pattern / History / Mode / Feather / Anti-alias missing

---

## Slice K — Polish (P2 grab-bag, deferred unless trivial)

- Polygonal Lasso 45° angle snap
- Lasso/Polygonal Lasso feather/anti-alias options
- Quick Selection brush size via `[`/`]`, Alt-paint subtract mid-stroke
- Magic Wand `sampleSize` (point / 3x3 / 5x5 / etc.)
- Magic Wand alpha-in-tolerance bug (drop `+3` index check)
- Vertical type RTL columns
- FontPicker recently-used and weight previews
- Underline/strikethrough scale by `scaleY`
- Background Eraser hot-spot crosshair
- Red Eye drag-to-define rectangle

---

## Sources (master list)

- Adobe helpx: https://helpx.adobe.com/photoshop/ (tool-techniques, selection, type, free-transform, crop, pen, paint)
- Julieanne Kost blog: https://jkost.com/blog/ (paint, type, layer, free-transform shortcuts)
- Photoshop Essentials: https://www.photoshopessentials.com/ (brush tips, free-transform CC 2019, layer shortcuts)
- Photoshop Training Channel: https://photoshoptrainingchannel.com/ (pen Auto Add/Delete, selections, reference point)
- Brendan Williams: https://www.bwillcreative.com/ (move tool, crop+straighten, full screen)
- Shapeshed Photoshop 101: https://shapeshed.com/

(Each finding above carries its specific source URL inline.)
