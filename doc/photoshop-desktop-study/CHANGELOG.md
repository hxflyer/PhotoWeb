# Photoweb Implementation Changelog

This is the historical timeline of major implementation passes. The active backlog (in-flight + remaining work) lives in [photoweb-implementation-backlog.md](photoweb-implementation-backlog.md); the active parallel-track ownership lives in [photoweb-parallel-development-plan.md](photoweb-parallel-development-plan.md). Move entries here only after they have shipped and been verified.

Format: one section per pass with date, test-count delta, and a one-paragraph summary. Detailed implementation notes live on the corresponding backlog rows.

---

## 2026-05-11 (evening) — Batch 7: Photoshop UX parity (research-driven gap fixes)

Tests: **710 / 87 → 748 / 93** (+38, +6 files). Lint: 0 errors. TypeScript clean.

Triggered by user prompt: *"looks like there are some plausibly implemented functions, not fully working, i need you review each tool/function/ui ... compare to our implementations, and correct our code accordingly, start several parallel sub agents to gather information first."*

Five research agents (paint+retouch, selection, vector, type, Move/Transform/Crop+global) compared each photoweb tool/dialog/shortcut against authoritative Photoshop docs (helpx.adobe.com, jkost.com, photoshopessentials, photoshoptrainingchannel). Their consolidated 110-finding gap report lives at [photoweb-photoshop-ux-gap-report.md](photoweb-photoshop-ux-gap-report.md).

### Slice A — Global keyboard shortcuts (`App.tsx`, `Viewport.tsx`) [+8 tests]
- **Spacebar = temporary Hand tool**: press-and-hold pushes a tool stack and swaps to `hand`; release restores. Suppressed inside editable elements.
- `Cmd+J` / `Cmd+Shift+J`: Layer via Copy / Cut (falls back to Duplicate Layer when no selection).
- `Cmd+G` / `Cmd+Shift+G`: Group / Ungroup active layer.
- `Cmd+E` / `Cmd+Shift+E` / `Cmd+Shift+Alt+E`: Merge Down / Merge Visible / Stamp Visible.
- `Cmd+1`: zoom to 100%.
- Migrated `Cmd+Shift+Alt+E` (was photoweb-only Export As) to `Cmd+Shift+Alt+W` to match Photoshop and free the standard Stamp Visible chord.

### Slice B — Move tool: Alt-duplicate, Shift-constrain, Auto-Select (`move.ts`, `OptionsBar.tsx`) [+5 tests]
- New `moveOptions = { autoSelect, showTransformControls }` module state with `set/getMoveOptions`.
- `Auto-Select` checkbox + Layer/Group scope dropdown now wired in OptionsBar; click hit-tests visible layer canvases top-down using the alpha channel.
- **Cmd-click** with Auto-Select off temporarily picks the topmost non-transparent layer for that one drag.
- **Alt-drag duplicates** the active layer and operates on the duplicate (`duplicateLayer` before drag begins).
- **Shift-drag constrains** motion to the nearest of H / V / 45° axes (`constrainAxis` snaps the drag delta to a multiple of π/4 around the larger magnitude).

### Slice C — Paint family modifier parity (`brush.ts`, `pencil.ts`, `eraser.ts`, `Viewport.tsx`, `App.tsx`) [+9 tests]
- **Shift+click** in brush / pencil / eraser stamps a straight line from the last remembered point on the same layer/target before starting the normal stroke. Each tool exposes a `clear*LastPoint()` helper for tests.
- **Number keys 1–9 / 0** set `brushSettings.opacity` (10%–90% / 100%) when a paint-family tool is active. **Shift+digit** sets `flow`. Photoshop's ~300 ms two-digit window composes consecutive digits (e.g. `2`+`5` → 25%).
- **Alt held with a paint-family tool** temporarily activates the Eyedropper; releasing Alt restores the paint tool (same stack pattern as Spacebar Hand).
- **Mouse pressure default 1.0** — `Viewport.buildToolPointerEvent` now reports `pressure = 1` for `mouse`/`touch` pointer types and `native.pressure` for `pen`. Fixes the silent half-size mouse-stroke regression when `pressureSize` is on.
- Added an `isPaintFamily(tool)` set covering brush/pencil/eraser/clone/healing/dodge/burn/sponge/blur/sharpen/smudge etc.

### Slice D — Dodge / Burn / Sponge history invariant + Alt-swap (`dodgeBurnSponge.ts`) [+5 tests]
- **Fixed invariant violation**: every tone-tool stroke now captures `before` at pointer-down, accumulates stroke bounds during the drag, and commits a single `createPixelHistoryAction` at pointer-up. Strokes are now properly undoable, matching CLAUDE.md's "every pixel-mutating action goes through history" requirement.
- **Alt held during a Dodge stroke** temporarily Burns (and vice versa); the swap is per-event, not persisted on the tool's `mode`.

### Slice F — Crop tool: aspect, modifiers, deleteCroppedPixels (`crop.ts`, `OptionsBar.tsx`) [+5 tests]
- **Aspect-ratio dropdown wired**: `<select>` now binds to `setCropOptions({ aspect })`; presets 1:1 / 5:4 / 3:2 / 4:3 / 16:9 / Custom; W/H inputs drive the custom ratio; Swap / Clear buttons functional.
- **Shift / Alt modifiers** during corner/side drag: Shift forces a square (or preset aspect when set), Alt grows symmetrically about the rect's center.
- **`deleteCroppedPixels = false`** now preserves layer pixels outside the new canvas bounds (re-cropping outward reveals them). Defaults changed from `false` → `true` to match Photoshop's modern default.

### Slice G — Type tool: commit + anti-alias (`type.ts`, `TextEditOverlay.tsx`, `CharacterPanel.tsx`) [+6 tests]
- **Numpad Enter commits** the type edit (main-keyboard Enter still inserts a newline; Cmd+Enter still commits as the secondary shortcut).
- **Switching tools** during an active type edit already triggered `commitActiveEditingType()` in `toolsSlice.setTool` — added a regression test to lock the behavior.
- **Anti-alias dropdown wired**: new `TextAntiAlias = 'none' | 'sharp' | 'crisp' | 'strong' | 'smooth'` field on `TextStyle`. `commitTypeLayer` maps each to `ctx.imageSmoothingEnabled` + `ctx.textRendering`. CharacterPanel exposes all 5 modes; the previous placeholder (disabled "Sharp"-only `<select>`) is gone. Default style includes `antiAlias: 'crisp'`.
- Cleaned up a placeholder "Khmer" language entry (Photoshop ships "English" by default; locale handling is deferred).

### Slice E — Free Transform constraints (`FreeTransformOverlay.tsx`) [+4 tests]
- **Shift on a corner drag** constrains the aspect ratio (driven by the larger of dx/dy, locking the smaller to maintain the original ratio).
- **Alt on any handle** grows the bounding box symmetrically about its center — for corners this mirrors both axes; for sides, only the perpendicular axis.
- **Outside-bbox rotate**: a transparent ring (24 px padding around the bbox) registers `mousedown` as a rotation drag. Inner scale handles render after the ring so they take pointer priority.
- **Shift while rotating** snaps the resulting angle to multiples of 15°.

### Slice J — Vector option-bar wiring (`OptionsBar.tsx`, `pen.ts`, `pathSelection.ts`) [+8 tests]
- **Shape Options Bar** Fill / Stroke / Stroke width / Shape-Path-Pixels mode are now wired to `setShapeOptions`. Fill and stroke swatches use a native `<input type="color">` over the visible swatch.
- **Pen options**: new `autoAddDelete` and `rubberBand` flags (both default `true`). With `autoAddDelete = false` the Pen no longer deletes anchors on click nor inserts on segment-hit. With `rubberBand = false` the live preview from last anchor to cursor is suppressed.
- **Direct Selection**: `Backspace` / `Delete` removes the currently-selected anchor (and removes the path entirely if it had only one anchor left).
- **Path Selection**: `Backspace` / `Delete` removes the entire active path.

### Slice H — Refine Edge live preview + Color Range eyedropper (`RefineEdgeDialog.tsx`, `ColorRangeDialog.tsx`, `utils/maskOps.ts`, `utils/refineEdgePreview.ts`) [+6 tests]
- **Refine Edge live preview**: on dialog open the original selection ops are snapshotted; every slider change re-runs the refine math (shiftEdge → shrink/grow, radius blur, smart-radius gradient-weighted blur, smooth median, contrast remap) via `computeRefinedSelectionOperation` and writes a new mask op to the store directly (bypassing history). Cancel restores the snapshot. OK restores then calls `refineEdge()` so the canonical history entry records a single change.
- Extracted the shared mask helpers (blur / contrast / median / Sobel gradient) into `src/utils/maskOps.ts` so both `selectionSlice.refineEdge` and the preview path use the same math.
- **Color Range on-canvas eyedropper**: while the dialog is open, a window-level capture-phase `mousedown` listener intercepts clicks on `[data-photoweb-document]`. The composite is sampled at the click coords; the picked hex updates the swatch and the samples list (no modifiers = replace, Shift = add, Alt = subtract).

### Slice I — Live Gradient handles + Clone Stamp source-ghost (`gradient.ts`, `cloneStamp.ts`) [+7 tests]
- **Live Gradient**: pointer-up no longer commits history. Instead the layer is snapshotted, the gradient is composited as a preview, and the start/end points stay editable. Subsequent pointer-downs near either endpoint reposition that handle; the layer reverts to the snapshot and recomposites each frame. Click off (away from handles) commits the previous preview as one history entry and starts fresh. `Enter` commits. `Esc` reverts to the snapshot. `onDeactivate` (tool switch) commits.
- **Clone Stamp ghost**: `renderCloneStampOverlay` now draws the sampled source patch as a translucent disc under the cursor (clipped to the brush footprint) instead of just an icon marker. Works on hover after Alt-sampling (no click needed) so users see what they're about to paint before they paint it.

---

## 2026-05-11 (evening, second pass) — Batch 7 wrap-up summary

Total Batch 7 delta: **710 / 87 → 773 / 97 (+63 tests, +10 files)**. Lint: 0 errors. TypeScript clean. Closed slices A through J of the [Photoshop UX gap report](photoweb-photoshop-ux-gap-report.md) — every P0 finding addressed; some P1 polish items deferred (right-click FT menu, Cmd+Shift+T re-apply, Magic Wand sample size, marquee box-select for paths, Magnetic Lasso, kerning Optical/numeric, Warp Text, etc. — listed in §Slice K of the gap report).

---

## 2026-05-12 (evening) — Parallel-plan Batch 6: audit-flagged perf + path persistence + UI completeness + adjustments completeness + P2 polish

Tests: **642 / 77 → 701 / 86** (+59, +9 files). Lint: 0 errors. TypeScript clean.

Shipped in 5 parallel agent slices:

### Slice A — Dirty-rect plumbing
- `Canvas2DCompositor` reads `Layer.dirtyRect` and, when every visible layer reports a non-full rect (and no adjustment/channel-isolation post-process is active), performs a **clipped composite** to the union of those rects (padded by 1 px for selection-edge anti-alias) instead of recomposing the full frame.
- New `unionDirtyRect(layers, w, h, pad)` helper exposed on the compositor.
- After every `render()`, the compositor walks every layer and calls `clearDirty()` so the next frame starts from a known-clean baseline.
- Full-frame repaint preserved as a fall-back: first render, `beginFrame()`-initiated frames, frame-size changes, post-process passes, null dirty rects — all force the legacy full composite.
- `applyFilter.ts` threads `layer.dirtyRect` into `FilterApplyContext`; **Gaussian Blur**, **Box Blur**, **Surface Blur**, and **Median** all walk only the dirty rect when one is supplied. The separable convolution helper extends its row/col range by `±kernelRadius` so edge pixels see correct neighbours.
- `Viewport.tsx` follow-up flagged: it currently calls `beginFrame()` before every `render()` which forces the full-frame path. Wiring viewport to skip `beginFrame()` between stroke RAF ticks unlocks the perf win in the live paint hot path — small future tweak.

### Slice B — Path persistence + Pen Shape-mode → shape-layer + Type > Convert to Shape + Edit > Stroke/Fill Path
- `pathStore.paths` and `activePathId` round-trip through the `.pwbdoc` manifest (additive field; backwards compatible). New `clearPaths()` helper for the loader.
- Pen tool in `mode: 'shape'` closes a path → creates a new `kind: 'shape'` layer with `shapeData.kind: 'custom'`. The path is consumed (matching Photoshop). Anchor Bezier curves are normalized into the 100×100 viewBox along the dominant axis.
- `Type > Convert to Shape` rewrites the active type layer in place: `traceLayerToPathD(layer)` walks the alpha mask, RDP-simplifies each contour, concatenates them into an SVG `pathD`. Original `kind / typeData / pixels` snapshotted on the history entry so undo restores byte-for-byte.
- `Edit > Stroke Path…` and `Edit > Fill Path…` dialogs (plus row-toolbar buttons in `PathsPanel`) — stroke samples the path's Bezier curves at N points and stamps the brush along the polyline; fill rasterizes the path to an alpha mask. Both via `createPixelHistoryAction` for single-entry undo.

### Slice C — Type / Shape UI completeness
- Paragraph panel exposes `spaceBefore / spaceAfter / indentLeft / indentRight / indentFirst` numeric inputs (renderer already honored them; UI hadn't).
- All Caps / Small Caps toggle buttons in CharacterPanel (mutually exclusive).
- `FontPicker` shared between Character panel and Properties Type section via an optional `layerId` prop that subscribes to `layer.typeData.style.fontFamily` in the store — changes propagate to both pickers.
- `Text Mode: Point | Paragraph` toggle in PropertiesPanel Type section; box-mode contenteditable now reflows with fixed-width + `word-break`.
- Vertical type rewritten with per-character `ctx.measureText(ch)`-driven advance; baseline-shift / superscript / subscript now apply to the horizontal axis in vertical mode.

### Slice D — Adjustments completeness
- New `Selective Color` adjustment: 9 ranges (Reds / Yellows / Greens / Cyans / Blues / Magentas / Whites / Neutrals / Blacks) × CMYK sliders × Relative / Absolute method. RGB→HSL classification with saturation-weighted falloff inside chromatic ranges; lightness-only tents for whites/neutrals/blacks.
- Color Balance preserveLuminosity correction clamped to `[-255, 255]` before subtraction so extreme Cyan-Red shifts on whites/blacks no longer flip to inverted tones.
- Properties panel `AdjustmentSection` rewritten with a per-adjustment param-meta table covering Brightness/Contrast (`useLegacy` checkbox), Channel Mixer (output select + 4 sliders + monochrome), Black & White (6 mix sliders + tint toggle + tint color), Selective Color (range + 4 sliders + method radio), Color Balance (tone + 3 sliders + preserve-luminosity).
- New Smart Sharpen mode-distinction test: applies Gaussian / Motion / Lens to a smooth gradient and asserts every mode pair differs on ≥ 5 % of pixels.

### Slice E — P2 polish
- Magic Eraser + Paint Bucket cursors `'cell'` → `'crosshair'`.
- Pencil tool gained `pressureSize` / `pressureOpacity` options matching Brush.
- Clone Stamp gained `sourceScale` (default 1) and `sourceRotation` (radians, default 0); the per-stamp source-canvas read coordinates are transformed by an affine translate-rotate-scale-translate.
- New filters: **Dust & Scratches** (radius + threshold; median replace where channel diff exceeds threshold) and **Despeckle** (3×3 median where neighborhood luma std-dev ≤ 24).
- Export Dialog `Flatten on color` checkbox + color picker (default white) visible only for JPEG.
- Viewport drag-drop import: image files add as a new layer; `.pwbdoc` files load via the existing recovery path; multi-file drops rejected with an info toast.
- Magic Eraser / Paint Bucket AA bright-ring fix: AA contribution scaled by `min(1, tol / 8)` at low tolerance, plus a 0.5× selection-edge pre-feather that attenuates AA pixels whose 4-neighbor min selection alpha is lower than their own.

New test files (Batch 6): `dirtyRectPerf.test.ts` (+12), `pathPersistence.test.tsx` (+3), `penShapeMode.test.ts` (+4), `strokeFillPath.test.tsx` (+5), `typeShapeUIBatch6.test.tsx` (+9), `selectiveColor.test.ts` (+6), `smartSharpenModes.test.ts` (+2), `colorBalanceClamp.test.ts` (+4), `batch6Polish.test.tsx` (+13). Total +59.

---

## 2026-05-12 (afternoon) — Parallel-plan Batch 5: audit-flagged correctness + UI completeness

Tests: **587 / 72 → 642 / 77** (+55, +5 files). Lint: 0 errors.

Shipped in 5 parallel agent slices:

### Slice A — Adjustment selection-awareness + mask plumbing
- `AdjustmentApplyContext` extended to mirror `FilterApplyContext`: gained `selectionMask: ImageData | null` and `dirtyRect: { x, y, width, height } | null`.
- New `buildEffectiveMask(selection, layerMask, w, h)` helper produces `selection_alpha × layer_mask_alpha` with `mask.density` (0–1 scaling) and `mask.feather` (box-blur) honored.
- `applyAdjustmentToTarget` and `applyFilterToLayer` both call `buildEffectiveMask`, so destructive adjustments and filters now respect selection feather + layer-mask density (previously the render-time compositor honored these but the destructive code paths didn't).

### Slice B — Effects fidelity + group + stroke options
- `Canvas2DCompositor.renderGroup` mirrors `renderDrawableLayer`'s underlay/overlay split, so `group.effects` actually render (previously silently skipped).
- Drop Shadow `spread` rewritten as edge hardening: dilate the tinted alpha by `spread × size`, then blur by the remaining budget — `spread=1` produces a near-hard edge, `spread=0` is pure Gaussian.
- Inner Glow `choke` applied to the alpha edge BEFORE the blur (not after), matching Photoshop's behavior at high choke.
- Pattern Overlay tile-wrap fix: integer tile rounding + canvas-origin modulo so scale ≠ 100% tiles seamlessly across canvas boundaries.
- Bevel & Emboss altitude clamped to `[0.5°, 89.5°]` epsilon range with `Number.isFinite` guards.
- Satin `contour: 'linear'` triggers a 1–2 px post-blur on the symmetric-difference buffer (distance-dependent) to smooth discrete bands.
- Gradient Overlay Properties UI gained `angle` slider, `scale` slider, and `alignment` select (Align with Layer / Align with Selection).
- `ShapeStroke` gained `dash?: number[]`, `lineCap?: 'butt' | 'round' | 'square'`, `lineJoin?: 'bevel' | 'round' | 'miter'`. Properties UI gained Dashed Line toggle, Cap select, Corners select. `applyStrokeStyleOptions` helper reads them in `shapeRender.ts`.

### Slice C — Shape + Type transform preservation
- `moveShapeTarget(data, dx, dy, scaleX, scaleY, rotationDelta)` rewrites `shapeData` geometry per-variant: rect/rounded-rect/ellipse bounds scale-and-shift; polygon center+radius+rotation; line endpoints scale around midpoint then rotate; custom translates+scales bounds.
- Move Tool captures `shapeDataBefore` on pointer-down, applies live geometry rewrites during pointer-move (no rasterization), commits a single `Move Shape Layer` history entry on pointer-up via `applyShapeEdit`.
- `FreeTransformOverlay` gained a `layer.kind === 'shape'` branch that decomposes the bounding-box delta into translate/scale/rotate, calls `moveShapeTarget` + `rerenderShapeLayer`. `shapeDataSnapshot` carried on `FreeTransformState`; cancel restores; commit records a `Free Transform Shape` history entry.
- Custom shape rendering switched to uniform scale with center-letterbox so non-1:1 aspect ratios no longer pinch the stroke.
- `TextEditOverlay` applies `transform.rotation` CSS so the contenteditable mounts at the rotated angle.
- `ShapeOperationButtons` (Combine / Subtract / Intersect / Exclude) wired to set `ShapeOptions.combineMode` for the next shape (MVP scope; combining existing shape layers via Path2D math deferred).

### Slice D — Color Range modes + Transform Selection + Border/Smooth/Defringe dialogs
- Color Range dialog gained Mode radio: `Replace / Add / Sub / Intersect` (default `Replace`). Shift / Alt / Shift+Alt on the eyedropper or color input flip the mode when it's still default.
- Color Range live preview canvas (300×200) renders the current selection mask as white-on-black, updating on every fuzziness / sample change.
- New `TransformSelectionOverlay.tsx` with 8 corner/edge handles + rotate handle. Enter commits (rasterize → affine transform → install via `setSelectionOperations`); Esc cancels.
- New `BorderSelectionDialog.tsx` + `SmoothSelectionDialog.tsx` — both numeric inputs with persisted last-used widths in `selectionDialogPrefs`. Border width now produces a true `dilate − erode` ring mask instead of the 1 px hardcoded ring.
- `smoothSelection(radius?: number)` action exposed (previously only via Refine Edge slider).
- `addLayerMaskFromSelection` now respects `selection.feather` via a two-pass box blur on the mask alpha (replacement for `ctx.filter` which node-canvas doesn't support).
- Defringe dialog width persists across opens.

### Slice E — UI shell completeness
- New `NavigatorPanel.tsx` — 220×150 mini-canvas painting visible non-group/non-adjustment layers scaled to fit; red proxy rectangle hints at the visible region; zoom slider + buttons; drag inside the canvas re-centers the viewport via `setPan`.
- New `InfoPanel.tsx` — cursor X/Y in canvas-space (`[data-photoweb-document]` rect-based); RGBA + HSB readout from active layer (or top visible raster); document dimensions + total memory.
- Both panels added to `RightPanelDock` tab loop ('navigator' + 'info'); panel visibility persists through Window menu toggles + localStorage.
- Quick Mask Q-shortcut wired end-to-end: when on, brush/eraser dabs route through `paintQuickMaskDab` into a per-document buffer; Viewport overlays a 50% red mask on the inverse of the buffer; toggling Q off calls `convertQuickMaskBufferToSelection` which installs the buffer alpha as a masked `add` selection op.
- `colorSlice.swatches` loads from `photoweb:swatches:v1` at slice init; persists on every mutation.
- Status bar cursor now reads canvas-space via `viewSlice.pan/zoom` (previously browser viewport coords); active-tool label added.
- Status bar memory estimate uses the same `computeEstimate` util as `StorageUsageDialog`.
- App boot applies persisted `uiScale` to `documentElement.style.fontSize` immediately (previously only on Preferences dialog commit).
- `Tab` and `Shift+Tab` bound to `toggleAllPanels` and `toggleAllPanelsExceptCanvas` (don't fire when focus is on text input / contenteditable).
- Autosave banner gained `role="status"` + `aria-live="assertive"` + themed accent colors.
- `isDirty` audit: 8 mutation paths (`addLayer`, `setLayerOpacity`, `renameLayer`, `setLayerBlendMode`, `toggleLayerVisibility`, `setLayerColorTag`, `setLayerLock`, `addLayerMask`) all flip the badge correctly; every layer-slice mutator routes through `executeDocumentCommand`.

New test files (Batch 5): `adjustmentSelection.test.ts` (+7), `effectsBatch5.test.tsx` (+14), `shapeTransform.test.tsx` (+11), `selectionWorkflowBatch5.test.tsx` (+13), `uiShellBatch5.test.tsx` (+10). Total +55.

---

## 2026-05-12 (morning) — Parallel-plan Batch 4: polish

Tests: **557 / 69 → 587 / 72** (+30, +3 files). Lint: **3 errors → 0** (StrokeControls hoist eliminated the `react-hooks/static-components` violations).

Shipped:
- Bevel & Emboss effect (4 styles × height-map + Sobel + Phong lighting) and Satin effect (symmetric distance fold + linear / cone / gaussian contours).
- Layer Style copy / paste / clear / scale via Properties panel + `Layer > Layer Style` submenu (`copiedLayerStyle` in-memory clipboard + Scale Effects dialog).
- Brush Presets panel + Pattern Presets panel with rename / reorder / duplicate.
- Custom shape library: `ShapeCustomData` discriminated-union variant + 8 built-in shapes (heart, star-5pt, star-7pt, arrow, lightning, speech-bubble, gear, checkmark) + Path2D `drawCustomShape` renderer.
- Searchable FontPicker with live preview, arrow-key navigation, missing-font fallback toast.
- Accessibility pass on all 17 dialogs (role=dialog + aria-modal + aria-labelledby + first-focus + Tab focus-trap + Esc-close via shared `useDialogA11y` hook + aria-labels on every toolbar button).
- `StrokeControls` lint refactor: hoisted out of `ShapeSection` (removes the 3 carried `react-hooks/static-components` errors).

New test files: `effectsBatch4.test.tsx`, `presetsPanels.test.tsx`, `fontPicker.test.tsx`.

Deferred: `Edit > Fill…` / `Edit > Stroke…` / `Filter > Fade Last…` dialogs (worktree preserved at `.claude/worktrees/agent-a03aa3bc7382876b7`; integration checklist in the parallel-plan doc).

---

## 2026-05-11 (night) — Parallel-plan Batch 3: workflow completion

Tests: **489 / 61 → 557 / 69** (+68, +8 files).

Shipped:
- `RET-04` Healing Brush (Alt-sample + mean-shift texture transfer, aligned mode).
- `RET-05` Patch Tool (source/destination modes using existing selection).
- `RET-06` Red Eye Tool (red-cluster detection + desaturate/darken pupil disc).
- Inner Glow + Gradient Overlay + Pattern Overlay (reuses `renderGradientCanvas` and `getPatternTile` so no duplicated render paths).
- SEL-04 remainder: Grow + Similar selection commands; Defringe; Remove White Matte / Remove Black Matte (premultiplied inversion); Smart Radius in Refine Edge (Sobel × per-pixel radius modulation).
- Snap-to-guides/grid/layers + smart-guide magenta overlay: shared `src/tools/snap.ts` consumed by `move.ts`, `selectionMove.ts`, `shapes.ts`, `FreeTransformOverlay.tsx`; transient `viewSlice.activeSnapTargets` painted on top.
- `STAB-02` autosave recovery: retry-once OPFS→localStorage fallback, corrupt-slot clearing on init, Recover/Discard banner, `isDirty` + `lastSavedHistoryTick` dirty-state in `documentSlice`, status-bar `● Unsaved changes` indicator, `window.confirm` on New/Open when dirty.
- `STAB-03` memory guardrails: `MAX_DOC_PIXELS = 60M` hard guard + `SOFT_DOC_PIXELS = 36M` soft warning on `newDocument` / `openImageAsDocument` / `resizeImage` / `resizeCanvas` with roll-back on alloc throw.

New test files: `healingBrush.test.ts`, `patchTool.test.ts`, `redEye.test.ts`, `effectsBatch3.test.tsx`, `selectionBatch3.test.ts`, `snap.test.ts`, `stab2.test.ts`, `stab3.test.ts`.

---

## 2026-05-11 (late evening) — Parallel-plan Batch 2: retouch depth + shape Properties

Tests: **430 / 55 → 489 / 61** (+59, +6 files).

Shipped:
- `PROPS-05` Shape Properties section with `shapeCommands.ts` (mirror of `typeCommands.ts`: `applyShapeEdit` + coalesced `begin/apply/commit` for slider drags).
- `RET-02` Background Eraser (continuous / once / background-swatch sampling × contiguous / discontiguous / find-edges limits).
- `RET-03` Spot Healing Brush (deterministic 24-bucket ring-sample proximity match).
- Inner Shadow + Outer Glow effects.
- `GUIDE-02` New Guide dialog + `View > Show > Guides` + `View > Lock Guides` + history-wrapped guide ops with drag coalescing.
- Gradient Stop Editor (color + opacity stops, smoothness, gradient presets in `toolsSlice` with localStorage round-trip).

New test files: `shapeProperties.test.tsx`, `backgroundEraser.test.ts`, `spotHealing.test.ts`, `effectsBatch2.test.ts`, `guidesHistory.test.tsx`, `gradientEditor.test.tsx`.

---

## 2026-05-11 (evening) — Parallel-plan Batch 1: highest user-expectation gaps

Tests: **387 / 51 → 430 / 55** (+43, +4 files).

Shipped:
- `SHAPE-01` editable shape data model: `ShapeData` discriminated union on `Layer` (rect / rounded-rect / ellipse / polygon-star / line-arrow), `rerenderShapeLayer` helper mirroring `rerenderTypeLayer`, Shape-mode tool creation, `.pwbdoc` round-trip, undo/redo.
- `PROPS-04` Type / Character / Paragraph undo coverage: `typeCommands.ts` (`applyTypeEdit` one-shot + `beginCoalescedTypeEdit` / `commitCoalescedTypeEdit` for drag commits on slider-end).
- `RET-01` Magic Eraser tool with tolerance + anti-alias + contiguous + sample-all + opacity, using Paint Bucket's flood-fill logic + `destination-out`.
- `STAB-01` failure → toast wiring via `toastsSlice.reportError(channel, message, type)` with `lastErrorChannel` dedup. Five channels: `save / load / autosave / export / quota`.

New test files: `shapeLayer.test.ts`, `typeUndo.test.tsx`, `magicEraser.test.ts`, `persistenceErrors.test.ts`.

---

## 2026-05-11 (afternoon) — Audit sweep

Tests: **(pre-audit) → 387 / 51**.

Source-review pass against the 549 Photoshop notes vs. the post-Phase-0–7 code surfaced 18 BUGs + 15 GAPs in shipped features. All shipped in this sweep:

BUGs (all closed): selection feather honored in adjustments/filters; Paint Bucket pattern source; saved-selections persistence; effect blend-mode in Properties; Refine Edge honest output labels; Load Selection add/sub/intersect modes; rectangular Marquee AA; High Pass premultiplied alpha; Eyedropper current-layer default; type-rotation hit-test; shape stroke vs. Stroke effect double-stroke; Color Picker hex display; Eraser block-mode spacing; Paint Bucket anti-alias edge ring; Warp handle zoom; type faux bold/italic via skew; autosave on fresh blank doc; gradient fill-layer custom stops.

GAPs (all closed): Define Pattern + pattern preset registry; Duplicate Layer; `fx` indicator; brush preset system; Polygon star; Line arrowheads; `Type > Create Work Path`; draggable guides; Preferences dialog; Storage Usage dialog; tool presets; spring-loaded shortcuts; Smart Sharpen modes; Gaussian blur perf guardrail; dirty-rect-tight history.

Plus: Color Range dialog + tool; arrow-key selection-border nudge; Type Properties section in PropertiesPanel; Hide/Show Selection Edges (`Cmd+H`).

New test files: `bugFixes.test.ts`, `bugFixesBatch2.test.ts`, `colorRange.test.ts`, `patternPresets.test.ts`, `historyDirtyRect.test.ts`, `textToPath.test.ts`.

---

## 2026-05-10 → 2026-05-11 — Foundation baseline (pre-audit)

Tests at the start of the parallel-plan sequence: ~380 across ~50 files.

Foundation that pre-existed the audit sweep (do not re-implement; these stay as the architectural bedrock):

- **History (`HIST-01` through `HIST-05`)**: full timeline + active cursor + redoable future, document snapshots that restore real state, configurable max history size, undo coverage for high-use operations including mask paint as first-class history.
- **Layers (`LAYERS-01` through `LAYERS-05`)**: groups + group-aware compositing + multi-layer selection + group/ungroup + align/distribute + mask thumbnails + mask enable/disable/link/unlink/apply/delete + non-destructive mask density (0–100%) and feather (0–250 px).
- **Properties panel (`PROPS-01` through `PROPS-03`)**: mounted in the right dock, active-layer-aware Layer / Mask / Adjustment / Fill / Effects sections. Adjustment-layer params editable live for every adjustment kind. Fill-layer solid color + gradient type/angle editable live. Mask density/feather as non-destructive composite-time controls.
- **Selection foundation (`SEL-02` partial, `SEL-03`, `SEL-06`)**: Refine Edge sliders (Radius/Smooth/Contrast/Feather/Shift) apply; Modify Selection ops backed by real distance-map dilation/erosion and median filter; Save/Load Selection dialogs.
- **Layer effects (`STYLE-01`, `STYLE-03`, `STYLE-02` Drop Shadow only, `STYLE-04` Color Overlay only)**: registry + compositor pipeline + per-effect renderer; Drop Shadow, Stroke (outside/center/inside), Color Overlay all functional with Properties-panel editing.
- **Wiring-debt sweep** (no individual ID): every option-bar control writes through to its engine; selection move-by-drag uniform across all selection tools; Shift-key cycles tool groups; `Cmd+/` opens an in-app keyboard-shortcut reference; Window-menu panel toggles persist to localStorage; Channels visibility eyes hide channels from the composite; Refine Edge sliders fully wired.
- **Mask paint mode**: brush/eraser/pencil retarget into `layer.mask.canvas`; mask paint is a first-class history entry; `Layer > Layer Mask > Reveal/Hide Selection` menu commands; compositor RGB→alpha mask conversion (structural fix).
- **Selection correctness**: true intersect via raster AND; iterative dilation/erosion expand/contract; median smooth; canvas-bounded inverse; intersect modifier resolved at pointer-down so Alt mid-drag still means "from centre".
- **Selection interaction refresh**: mouse-down outside an existing selection dismisses immediately; mouse-down inside preserves the selection; drag from inside translates the selection border across marquee, lasso, polygonal lasso, magic wand, and quick selection. Move Tool selected-pixel drag + arrow-key nudging + hide/show selection edges.
- **Persistence**: `.pwbdoc` round-trips layer mask (with density/feather), typeData, adjustment params, fillData, layer effects, locks, color tag.
- **Non-destructive workflow**: `Image > New Adjustment Layer >` submenu for every adjustment kind; `applyAdjustmentToLayer` and `applyFilterToLayer` honor `layer.mask` combined with the active selection.
