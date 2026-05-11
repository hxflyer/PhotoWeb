# Photoweb Parallel Development Plan

Purpose: turn the 1000-case user review into a parallel implementation plan that stays inside the scoped browser-photo-editor direction in [photoweb-development-plan.md](photoweb-development-plan.md).

Created: 2026-05-11.

Primary inputs:
- [photoweb-development-plan.md](photoweb-development-plan.md): product scope, exclusions, milestones, and current implemented foundation.
- [photoweb-implementation-backlog.md](photoweb-implementation-backlog.md): executable source of truth for requirement status.
- [photoweb-user-cases.md](photoweb-user-cases.md): user-side QA inventory and future-case checklist.
- Source notes in [pages/](pages/) and image references in [images/](images/) must still be read before each implementation slice.

## Scope Contract

Build toward a practical local browser photo editor, not a full Photoshop clone.

In scope:
- Layers, groups, masks, selections, selected-pixel movement, history, local save/export, adjustment/fill layers, basic filters, retouching, text basics, editable shape basics, paths, guides, snapping, presets, settings, storage diagnostics, and testable reliability.

Out of scope unless the user explicitly changes direction:
- AI/generative tools, Remove Tool, Content-Aware Fill, Neural Filters, subject/object detection, cloud/account/collaboration features, print/CMYK/prepress, video/timeline/animation, actions/batch/droplets/scripting, Smart Objects, Smart Filters, PSD/PSB/PDF/TIFF parity, advanced export pipelines, advanced brush dynamics, and in-app help/release-note/support surfaces.

## Planning Rules

- Treat [photoweb-implementation-backlog.md](photoweb-implementation-backlog.md) as the status source of truth.
- Treat [photoweb-user-cases.md](photoweb-user-cases.md) as the QA and behavior inventory, not as proof that a feature is implemented.
- Each agent should own one function group and one write surface at a time.
- Shared chokepoints need an integrator pass instead of parallel edits: `src/components/Panels/PropertiesPanel.tsx`, `src/store/layersSlice.ts`, `src/store/types.ts`, `src/core/Canvas2DCompositor.ts`, `src/App.tsx`, app menus, persistence serializers, and global shortcut routing.
- Every mutating feature must use history/command infrastructure and add undo/redo tests.
- Every durable layer/document model change must add `.pwbdoc` persistence tests.
- Every pixel operation must be tested with selection clipping and mask clipping where the operation claims to support them.
- User-case ID ranges quoted under each Track are inclusive ranges over the matrix in [photoweb-user-cases.md](photoweb-user-cases.md). After the 2026-05-11 out-of-scope pruning, some IDs inside the quoted ranges no longer exist (553, 554, 561 — AI selection; 617, 620, 621, 637, 642 — AI/generative retouch; 661, 662, 667 — CMYK/indexed color; 791 — Adobe Unified Text Engine). Treat missing IDs as intentionally absent, not as misses.

## Dependency Map

| Dependency | Unlocks | Notes |
|---|---|---|
| Existing history/command system | All remaining document mutations | Already implemented; every new feature must reuse it. |
| Real editable shape data (`SHAPE-01`) | Shape Properties, editable line/star/rounded-rect options, shape snapping, custom shape presets | Highest expectation gap because current shape tools still rasterize. |
| Type edit command wrappers (`PROPS-04`, `TEXT-01`) | Safe Properties/Character/Paragraph editing | Mostly independent of shape core, but conflicts in Properties UI. |
| Select and Mask output destinations (`SEL-02` partial) | Patch workflow, refined-mask workflow, cutout workflows | `selection / layer-mask / new-layer-with-mask` outputs have shipped (see `RefineEdgeDialog.tsx` `OutputTarget`). Remaining `SEL-02` work is smart radius + decontaminate + matte commands. User cases 293, 580, 581 are now true. |
| Selection/mask clipping helpers | Retouch, erasers, filters, adjustments | Existing helpers are strong enough to start retouch tools. |
| Pattern/gradient registry and editor | Pattern Overlay, Gradient Overlay, pattern fill layers, gradient presets | Pattern basics exist; gradient stop UI is the next shared primitive. |
| Guide/snap state and layer bounds | Snap-to-guides/grid/layers, smart guides, selected-pixel snap | Guide rendering exists; snap targets still need wiring. |
| Storage diagnostics/toast path | Autosave recovery, save/load failure UX, memory guardrails | Must be available before deeper reliability work. |

## Parallel Tracks

### Track A - Editable Shape Layer Core

Backlog IDs: `SHAPE-01`, `PROPS-05`, later `SHAPE-04`.

User cases: 414-425, 537, 717-736, 748, 750.

Goal: make Shape mode honest by creating layers with editable shape geometry and style instead of only raster pixels.

Build slices:
- Define a `shapeData` discriminated union on `Layer.shapeData` covering at minimum:
  - `{ kind: 'rect', bounds, fill, stroke }`
  - `{ kind: 'rounded-rect', bounds, cornerRadius, fill, stroke }`
  - `{ kind: 'ellipse', bounds, fill, stroke }`
  - `{ kind: 'polygon', center, radius, sides, star, starRatio, rotation, fill, stroke }`
  - `{ kind: 'line', p0, p1, weight, arrowStart, arrowEnd, arrowSize, stroke }`
  Where `fill = { type: 'solid', color } | { type: 'gradient', stops, angle, gradientKind } | { type: 'pattern', patternId }` and `stroke = { color, width, opacity, alignment, dash? }`. Reuse the existing `GradientStop`, `PatternPreset` types from `toolsSlice.ts`.
- Create shape layers when Shape mode is selected in the option bar; keep Pixels mode intentionally raster (no behavior change for the latter).
- Rerender shape layers from `shapeData` on every fill/stroke/line/rounded-corner/polygon edit. Use a single `rerenderShapeLayer(layer)` helper, parallel to the existing `rerenderTypeLayer(layer)` in `src/tools/type.ts`.
- Persist `shapeData` through `.pwbdoc`. Bump `LayerManifest` shape and add a backwards-compatible migration when `shapeData` is absent on load.
- Add Properties controls (`PropertiesPanel.tsx`, new Shape section) for fill, stroke, stroke width, corner radius, polygon sides + star + star ratio, line weight, and arrowhead start/end/size.
- Transform/move: preserve shape editability by transforming the underlying `shapeData` geometry (rect bounds, ellipse bounds, polygon center/radius, line endpoints) rather than rasterizing.
- Add a small local custom-shape preset library only after first-class shape layers exist.

Write ownership:
- Primary: shape tool files, shape render helpers, shape tests.
- Integrator-only: `store/types`, `layersSlice`, `PropertiesPanel`, persistence.

Definition of done:
- Creating and editing each supported shape is undoable.
- Shape mode no longer rasterizes unexpectedly.
- Pixels mode still rasterizes intentionally.
- Save/reopen preserves geometry and style.
- Tests cover rectangle, rounded rectangle, ellipse, polygon/star, line arrowheads, Properties edits, undo/redo, and persistence.

### Track B - Type Editing Reliability

Backlog IDs: `PROPS-04`, `TEXT-01`, later `TEXT-02`.

User cases: 426-450, 751-800, A003.

Goal: keep the existing text workflow but make every Properties, Character, and Paragraph edit history-safe.

Build slices:
- Wrap Properties-side text, font family, size, color, alignment, and orientation updates in undoable commands. Use `createCommandAction({ kind: 'type-edit', label, apply, revert, layerId })` and dispatch through `executeCommand`. The `apply` closure should call `rerenderTypeLayer(layer)` so the visible canvas updates.
- Be careful not to break the contenteditable-overlay lifecycle: `commitActiveEditingType()` must still run before the layer's `typeData` is patched, and the overlay must remount cleanly after re-render. Add a regression test that opens the type editor, edits in Properties, and confirms the overlay is still attached to the right layer.
- Wrap Character panel changes (`Character.tsx` calls into `typeData`) in undoable commands. Throttle/coalesce rapid sliders into one history entry per "drag end" event.
- Wrap Paragraph panel changes the same way.
- Add font-picker search and missing-font fallback only after command wrapping is stable.
- Keep advanced typography disabled or clearly deferred: glyph panels, OpenType alternates, dynamic text, bullets/numbers, text on path, path text, and complex international controls.
- Consider image-filled text later through masks/clipping rather than a custom text engine.

Write ownership:
- Primary: type utilities, Character/Paragraph panel command wrappers, type tests.
- Integrator-only: `PropertiesPanel`, global shortcut focus handling.

Definition of done:
- User can undo and redo text content/style edits from every text UI surface.
- Editing rotated text remains correct.
- Save/reopen keeps `typeData`.
- Tests cover Properties, Character, Paragraph, transform preservation, typing focus, undo/redo, and persistence.

### Track C - Retouch And Eraser Tool Family

Backlog IDs: `RET-01` through `RET-06`.

User cases: 376-400, 601-650.

Goal: add deterministic non-AI cleanup tools that work with selections, masks, and history.

Build slices:
- Magic Eraser: Magic-Wand-like erase to transparency with tolerance, contiguous, anti-alias, sample-all, selection clipping, and undo. Reuse `buildFillAlphaMask`-style flood fill code from `paintBucket.ts` for tolerance + contiguous + selection clipping; commit through `createPixelHistoryAction` with the existing dirty-rect helpers.
- Background Eraser: brush sampled-color removal with tolerance and sampling mode (Continuous / Once / Background Swatch). Sampling mode parity with Photoshop matters for muscle memory.
- Spot Healing Brush: local neighborhood replacement for small blemishes. Use a Gaussian-weighted average of neighbor pixels outside the stamp radius.
- Healing Brush: Alt/Option source sampling, texture transfer, tone/color blend, aligned mode if feasible. Reuse the Clone Stamp source-anchor logic from `cloneStamp.ts`.
- Patch Tool: use an existing selection as the repair region. Depends only on the already-shipped selection-as-mask helpers and `addLayerMaskFromSelection` in `layersSlice.ts` — does not need the remaining `SEL-02` smart-radius work.
- Red Eye Tool: desaturate/darken red clusters around the click with pupil size and darken amount.

Cross-cutting refactor opportunity (do this in Batch 1 before Healing tools land):
- Extract a shared `stampBrush(ctx, tip, x, y, opacity, mode)` helper from the near-identical stamp logic in `brush.ts`, `pencil.ts`, `eraser.ts`, `cloneStamp.ts`, and `dodgeBurnSponge.ts`. Land it as a refactor with zero behavior change first, with regression tests; then have the new retouch tools consume it. This is the audit-flagged refactor from `current-state-review` §5 and is much cheaper to do before five new paint-family tools land than after.

Write ownership:
- Primary: new retouch tool files (`src/tools/magicEraser.ts`, `backgroundEraser.ts`, `spotHealing.ts`, `healingBrush.ts`, `patch.ts`, `redEye.ts`), options-bar retouch controls (`OptionsBar.tsx`), retouch tests (`src/test/retouch*.test.ts`).
- Coordinate with the `stampBrush` refactor PR if it has not landed.
- Toolbar icon assets via `scripts/icon_grid.py` (see CLAUDE.md §7).
- Integrator-only: `toolsSlice.ts` `activeTool` enum widening; toolbar registration order.

Definition of done:
- Each tool is visible in the correct toolbar group with a matching cursor/icon and options.
- Each operation is undoable and respects active selection.
- Pixel tools respect layer masks when the operation claims mask-aware editing.
- Tests cover happy path, selection clipping, mask clipping, and undo/redo.

### Track D - Selection, Matting, And Cutout Workflow

Backlog IDs: `SEL-02`, `SEL-04`; future menu-parity cases for selected-pixel copy/paste.

User cases: 276-325, 552-600.

Goal: make manual cutout workflows strong without AI selection.

Already shipped (do not redo):
- Select and Mask output destinations (current selection, layer mask on active layer, duplicated/new layer with mask) — `OutputTarget` in `RefineEdgeDialog.tsx` covers all three.
- Refine Edge sliders (Radius/Smooth/Contrast/Feather/Shift Edge) apply on `Apply`.
- Save Selection / Load Selection dialogs, including add/sub/intersect modes on Load (`loadSelection(name, mode)` in `selectionSlice.ts`).
- `savedSelections` round-trip in the `.pwbdoc` manifest.

Build slices (remaining):
- Smart radius: per-pixel adaptive feather along the gradient. Must be deterministic; document the algorithm before coding.
- Decontaminate / defringe and Remove White Matte / Remove Black Matte commands.
- Grow and Similar selection commands (currently `[ ]` in `MenuBar.tsx`).
- Menu commands for copy selected pixels to new layer, paste as new layer, paste into selection as mask, and paste outside selection as mask. `Cmd+C` / `Cmd+V` already work for clipboard; menu parity is what's missing.
- Border dialog UI (the underlying `borderSelection` op already exists).
- Live preview verification for overlay/black/white/transparent backgrounds if the dialog exposes them.
- Transform-selection-border only after existing selected-pixel transform remains stable.

Write ownership:
- Primary: selection operations, Select and Mask dialog, selection tests.
- Coordinate with retouch Patch Tool and mask/layer creation commands.

Definition of done (for the remaining slice):
- Smart-radius output reduces fringing on hair/fur test images without leaving zoned banding artifacts.
- Decontaminate / matte commands visibly reduce synthetic halos on a cut-out raster layer test.
- Grow/Similar produce expected pixel counts for a known tolerance.
- Copy-to-new-layer / paste-into-selection / paste-outside-selection round-trip correctly via undo/redo.
- Tests cover smart radius, matte removal, defringe, Grow/Similar, selected-pixel copy/paste, and undo/redo.

### Track E - Remaining Layer Effects

Backlog IDs: `STYLE-02`, `STYLE-04`, future style copy/paste/scale.

User cases: 226-250, 782-784, A001-A002.

Goal: complete the practical layer-style set without building preset style libraries.

Build slices:
- Inner Shadow with angle, distance, size, spread/choke, opacity, color, blend mode, and optional global light. Mirror the structure of `src/effects/dropShadow.ts` but render with `destination-in` against the layer alpha.
- Outer Glow and Inner Glow with opacity, color, spread/choke, size, and blend mode. Outer Glow reuses the dilate-by-blur pattern from `stroke.ts`; Inner Glow uses an inverted-alpha blur composited inside.
- Gradient Overlay using the shared gradient model. Reuse `renderGradientCanvas(...)` from `src/tools/gradient.ts`; do not duplicate the gradient render path.
- Pattern Overlay using pattern presets. Reuse `getPatternTile(id)` and the tile-via-getImageData/putImageData logic already in `paintBucket.ts`'s `compositePatternFill`. The effect renderer's input is `{ patternId, scale, opacity, blendMode }`.
- Bevel & Emboss and Satin only after shadows/glows/overlays are stable.
- Copy/paste/clear styles and scale effects. Stored copy buffer lives in `panelsSlice` or a tiny dedicated slice; the clipboard is in-memory only.

Write ownership:
- Primary: `src/effects/innerShadow.ts`, `outerGlow.ts`, `innerGlow.ts`, `gradientOverlay.ts`, `patternOverlay.ts`, and effects tests.
- Integrator-only: `Canvas2DCompositor.ts` underlay/overlay placement, `PropertiesPanel.tsx` effects editor sections.
- Coordinate with Track G (gradient stop editor) before Gradient Overlay so a `GradientStop[]` is editable end-to-end.

Definition of done:
- Effects render non-destructively, can be toggled/removed, and save/reopen.
- Effect changes are undoable.
- Tests assert visible pixel changes for each renderer and round-trip parameters through persistence.

### Track F - Guides, Snapping, Navigation, And Measurement

Backlog IDs: `GUIDE-02`, `GUIDE-03`, related user-case future rows.

User cases: 476-500, 851-875, 974-980.

Goal: make guides and snapping useful for layout-like photo edits without turning Photoweb into a print/layout tool.

Build slices:
- Numeric New Guide dialog (`Edit > Preferences > New Guide…` or `View > New Guide…`) and a `View > Show > Guides` toggle. Read/write `viewSlice.guides`.
- History wrapping for `addGuide`/`moveGuide`/`removeGuide`/`clearGuides` via `executeDocumentCommand`. Decide first whether guides are document state (persist in `.pwbdoc`) or local view state (do not). The current implementation puts them in `viewSlice`, which suggests view-state; persistence is a follow-up decision.
- Lock guides: a `locked` flag per guide; tools refuse to move locked guides.
- Snap targets: design a single `snapPoint({x, y}, targets, hysteresis): {x, y}` helper and consume it from every snap-aware consumer:
  - `src/tools/move.ts` (selected-layer drag)
  - `src/tools/selectionMove.ts` (selection-border drag, selected-pixel drag)
  - `src/tools/shapes.ts` (live shape drawing)
  - Transform handles in the Free Transform overlay
  - `src/components/Canvas/Viewport.tsx` (rendering of the snap-line cue)
  Targets: document bounds, grid (when `showGrid && snapEnabled`), guides, layer bounding boxes (computed per-frame from the compositor or cached in `layersSlice`).
- Smart-guide alignment hints during move/transform: render as ephemeral overlay lines; do not mutate state. Hide on mouseup.
- Pixel-distance measurement if it remains lightweight and useful (Info panel ruler crosshair already shows position; a marquee-style measurement tool is a bigger lift).

Write ownership:
- Primary: `viewSlice.ts` guide helpers, a new `src/tools/snap.ts` for the shared snap-point math, overlay rendering in `Viewport.tsx`, guide tests.
- Coordinate-required (one owner during this slice): `move.ts`, `selectionMove.ts`, `shapes.ts`, transform-handle code. These five consumers all import the new `snapPoint` and must be updated together.

Definition of done:
- Snapping is predictable and can be toggled.
- Smart guides are visual-only until a snap commit occurs.
- Guide state persists only if product decides guides are document state rather than local view state.
- Tests cover New Guide, clear, lock, snap-to-guide, snap-to-grid, snap-to-layer, and smart-guide rendering.

### Track G - Presets, Gradient, Pattern, And Fill Polish

Backlog IDs: currently completed basics plus future cases around brush/pattern/gradient/tool presets.

User cases: 351-375, 651-700, 701-716, A006, A012, A015.

Goal: make presets practical without advanced brush dynamics or external Photoshop pack compatibility.

Build slices:
- Dedicated brush preset panel for save/apply/delete/rename/reorder. The model exists (`brushPresets` in `toolsSlice.ts`); this is purely a panel UI.
- Pattern preset UI for select/remove/rename and tiling preview. The model exists (`patternPresets`, `activePatternId`, `getPatternTile`, `decodePatternPreset` in `toolsSlice.ts`); this is panel UI + thumbnail rendering.
- Gradient stop editor: visualize and edit `GradientStop[]` (color stops, opacity stops, midpoint/location). The `GradientStop` shape already exists in `src/tools/gradient.ts`. Edits should write back to `gradient` options for the Gradient tool and to `fillData` for gradient fill layers — the same `GradientStop[]` flows through both.
- Saved gradient presets — localStorage-backed, same pattern as brush/pattern presets.
- Pattern fill layer type if useful after pattern presets stabilize. Reuses `fillData` slot with `{ type: 'pattern', patternId }`.
- `Edit > Stroke…` dialog: stroke selection or layer boundary with a chosen color, width, position. Currently disabled stub in `MenuBar.tsx`.
- `Edit > Fill…` dialog: fill selection / layer with FG, BG, pattern, history-state, or 50% gray; respect selection. Currently disabled stub in `MenuBar.tsx`.
- Fill transparent pixels command (a special case of the above with the lock-transparency flag).

Write ownership:
- Primary: new preset panels (`src/components/Panels/BrushPresetsPanel.tsx`, `PatternPresetsPanel.tsx`), gradient stop editor (likely a child of `OptionsBar.tsx` or a popover), `EditFillDialog.tsx`, `EditStrokeDialog.tsx`, and the matching tests.
- Coordinate with Track E (Gradient Overlay / Pattern Overlay) so the gradient/pattern editing surfaces are shared, not duplicated.

Definition of done:
- Presets are local-first and persist in localStorage or document storage as appropriate.
- Gradient stop edits affect both gradient tools and gradient fill layers consistently.
- Tests cover preset persistence, applying presets, gradient stop editing, and selection/mask clipping for fill/stroke commands.

### Track R - Cross-Cutting Refactors (small, audit-flagged)

These are not a feature track — they are low-risk refactors that should land before the features above touch the same code, otherwise they will get harder. Each is independent and small.

- `REFACTOR-stampBrush`: extract `stampBrush(ctx, tip, x, y, opacity, mode)` from `brush.ts`, `pencil.ts`, `eraser.ts`, `cloneStamp.ts`, `dodgeBurnSponge.ts`. Land with no behavior change and existing tests passing; the Track C retouch tools consume it instead of copy-pasting. Prevents drift across six paint-family tools.
- `REFACTOR-toolDefaults`: move per-tool size/opacity/hardness from the tool files into `toolsSlice.brushSettings` where they belong; eraser and dodge/burn keep local copies today.
- `REFACTOR-toolConstants`: create `src/tools/constants.ts` for hit radii, dash widths, min-crop-size — currently spread across tool files.
- `REFACTOR-globalHistoryEntry`: route pixel-action commits through the slice instead of importing `globalHistory` directly in tools. Adds compile-time safety against future tools bypassing history.
- `REFACTOR-typeBridge`: replace `window.__selectionAsPath` and the type-tool `getStoreRef`/`textEditorBridge` ad-hoc globals with proper slice actions and refs.

Each refactor should ship as its own PR with the existing test suite green and zero new feature work.

### Track H - Stability, Save/Recovery, Performance, And Accessibility

Backlog IDs: `STAB-01` through `STAB-03`, accessibility future rows.

User cases: 042-044, 051-074, 951-1000.

Goal: make the editor safe for real browser use: clear errors, recoverable autosave, memory limits, and testable UI behavior.

Build slices:
- Route save/load/export/autosave failures into actionable toast messages via the existing `toastsSlice.addToast(message, type)`. Replace silent `catch {}` blocks in `persistence.ts`, `autoSave.ts`, and `ExportDialog.tsx` with named error toasts (`'storage-quota'`, `'serialization'`, `'export-failed'`, etc.).
- Add autosave recovery banner tests for write/recover/dismiss flows. Cover the case where the autosave is corrupt and the dismiss path clears the recovery slot in OPFS.
- Add oversized document/open/import guardrails with graceful failure. Threshold lives in `Preferences` (already shipped) or a default; warn before allocation, return a recoverable error if backed off.
- Add dirty-state tracking and save warning before destructive document replacement. Tie to `historyTick` advancing past `lastSavedHistoryTick` (similar to the autosave gating already in place).
- Add keyboard-focus and accessible-label audit for dialogs/toolbars.
- Add UI icon/cursor consistency tests where possible.
- Dirty-rect plumbing in compositor and individual filters: the schema is in place (`Layer.dirtyRect`, `Filter.context.dirtyRect`) but no filter or the compositor reads it. Concrete slice: make `Canvas2DCompositor` recompose only the dirty region of the on-screen canvas; pick three filters (Gaussian Blur, Levels, Hue/Saturation) and make them walk only the dirty region when the layer's selection / mask bounds permit. Tests should assert that `getImageData` is called with the dirty bounds, not the full canvas.
- Keep comparison docs, backlog, and development plan updated after major implementation batches.

Write ownership:
- Primary: `persistence.ts`, `autoSave.ts`, `toastsSlice.ts` consumers, accessibility tests.
- Integrator-only: app shell, menus, and the compositor (because dirty-rect plumbing is one of the deepest shared paths).

Definition of done:
- Failures are visible and actionable, not silent.
- Autosave can be recovered or dismissed.
- Large-canvas guardrails prevent corrupt half-created documents.
- Tests cover storage failure, autosave recovery, export failure, unsupported file input, and accessible labels for high-use controls.

## Recommended Parallel Batches

### Batch 1 - Highest User-Expectation Gaps — SHIPPED 2026-05-11

All four Batch 1 slices landed via parallel agent worktrees on 2026-05-11. Final test count: **430 passing across 55 files** (up from 387/51).

| Agent | Slice | Status | Tests added | Key files |
|---|---|---|---|---|
| A | `SHAPE-01` shape data model + Shape-mode layer creation + persistence + rerenderShapeLayer | `[x]` | +14 | `src/store/types.ts` (ShapeData union), `src/core/Layer.ts` (shapeData field), `src/tools/shapeRender.ts` (new), `src/tools/shapes.ts` (Shape-mode creates shape-kind layers), `src/core/persistence.ts` (round-trip), `src/store/historySlice.ts` (undo restore) |
| B | `PROPS-04` Properties/Character/Paragraph type-edit undo coverage with drag coalescing | `[x]` | +8 | `src/tools/typeCommands.ts` (new — applyTypeEdit + coalesced begin/commit), `src/components/Panels/PropertiesPanel.tsx`, `CharacterPanel.tsx`, `ParagraphPanel.tsx` |
| C | `RET-01` Magic Eraser tool | `[x]` | +10 | `src/tools/magicEraser.ts` (new), `src/test/magicEraser.test.ts` (new), `OptionsBar.tsx`, `Toolbar.tsx`, `PhotowebIcons.tsx`, `App.tsx` Shift+E cycle |
| E | `STAB-01` save/load/autosave/export failure → toastsSlice with channel dedup | `[x]` | +11 | `src/store/toastsSlice.ts` (lastErrorChannel + reportError), `src/core/persistence.ts`, `autoSave.ts`, `ExportDialog.tsx`, `src/test/persistenceErrors.test.ts` (new) |

Items not yet covered (rolled into Batch 2):
- PROPS-05 Shape Properties section (depends on Agent A's `ShapeData`; deferred to integrator-owned Properties panel pass).
- SHAPE-01 transform/move preservation through the Move Tool path (Agent A flagged this — currently still rasterizes).
- Stroke-alignment edge artifacts at very thin strokes (Agent A flagged; acceptable for Batch 1).

Integrator after every batch (canonical checklist):
1. Merge any new Properties sections into `PropertiesPanel.tsx` so the active-layer surface stays coherent.
2. Update `src/store/types.ts` so new model fields are typed once, not duplicated across slices.
3. Update persistence serializers in `src/core/persistence.ts` for any new durable fields, with backwards-compatible defaults on load (older `.pwbdoc` files must still open).
4. Run `npx tsc -b`, `npm run lint`, and `npm test`. Lint count must be no-worse-than-before.
5. Run `npm run dev` and walk the golden path for each affected Track in a browser.
6. Update `photoweb-implementation-backlog.md` checkboxes and add implementation notes.
7. Update `photoweb-user-cases.md` only for cases whose status flipped (e.g., "in future" → fact).
8. Update `photoweb-development-plan.md` Milestone state if a milestone deliverable changed.
9. Update this plan only if a Track's dependency map, ownership, or scope shifted.

### Batch 2 - Retouch Depth And Shape Properties — SHIPPED 2026-05-11

All five Batch 2 slices landed via parallel agent worktrees. Final test count: **489 passing across 61 files** (up from 430/55 after Batch 1).

| Agent | Slice | Status | Tests added | Key files |
|---|---|---|---|---|
| A | `PROPS-05` Shape Properties section + `shapeCommands.ts` (one-shot + coalesced begin/commit mirror of typeCommands) | `[x]` | +13 | `src/tools/shapeCommands.ts` (new), `src/components/Panels/PropertiesPanel.tsx` (ShapeSection per discriminated variant), `src/test/shapeProperties.test.tsx` |
| B | `RET-02` Background Eraser (continuous/once/background-swatch sampling × contiguous/discontiguous/find-edges limits) + `RET-03` Spot Healing (deterministic 24-bucket ring sample) | `[x]` | +15 | `src/tools/backgroundEraser.ts` (new), `src/tools/spotHealing.ts` (new), OptionsBar + Toolbar + icons, ToolId widening, Shift+E and J shortcuts |
| C | Inner Shadow + Outer Glow effects | `[x]` partial-style still pending (Inner Glow + Gradient Overlay + Pattern Overlay + Bevel) | +10 | `src/effects/innerShadow.ts` (new), `src/effects/outerGlow.ts` (new), `src/effects/index.ts` registration, PropertiesPanel Effects "+ Add…" extended |
| D | `GUIDE-02` New Guide dialog + Show/Lock toggles + history-wrapped guide ops with drag coalescing | `[x]` | +13 | `src/components/Dialogs/NewGuideDialog.tsx` (new), `viewSlice` (addGuideWithHistory / moveGuideWithHistory + drag begin/commit / removeGuideWithHistory / clearGuidesWithHistory, showGuides + guidesLocked + isNewGuideDialogOpen), MenuBar View menu, Viewport guide-render gating |
| E | Gradient Stop Editor (color + opacity stops, smoothness, presets) | `[x]` | +8 | `src/components/Dialogs/GradientEditorDialog.tsx` (new), `gradientPresets` array + 3 actions on toolsSlice (localStorage-backed), Edit Gradient button in Gradient OptionsBar + PropertiesPanel Fill section |

Items not yet covered (rolled into Batch 3):
- Inner Glow + Gradient Overlay + Pattern Overlay + Bevel & Emboss + Satin renderers.
- Healing Brush (sampled source) + Patch Tool + Red Eye Tool.
- Smart radius / decontaminate / matte commands + Grow/Similar (SEL-02 partial remainder).
- Snap-to-guides/grid/layers + smart guides (Track F follow-up).
- Move-Tool / Free Transform path for shape layers (SHAPE-01 follow-up — currently still rasterizes on transform commit).
- Brush/pattern preset panel rename/reorder/import-export UI.

Lint cleanup carried into Batch 3:
- Agent A's `ShapeSection` defines a nested `StrokeControls` component inside the render body (3 usages → 3 `react-hooks/static-components` errors). Functional but flagged by lint. Refactor: hoist `StrokeControls` to module scope and accept the closure vars (`data`, `patch`, `setStrokeField`, `setStrokeFieldCoalesced`, `coalescedCommit`) as props.

### Batch 3 - Workflow Completion — SHIPPED 2026-05-11 (night)

All 5 slices landed via parallel agent worktrees. Final test count: **557 passing across 69 files** (up from 489/61 after Batch 2). Lint debt unchanged at this stage.

| Agent | Slice | Status | Tests added |
|---|---|---|---|
| A | `RET-04` Healing Brush (Alt-sample + mean-shift texture transfer, aligned mode) + `RET-05` Patch Tool (source/destination modes using existing selection) + `RET-06` Red Eye Tool (red-cluster detection + desaturate/darken pupil disc) | `[x]` | +17 |
| B | Inner Glow (erode + blur + multiply with original alpha) + Gradient Overlay (reuses `renderGradientCanvas` + `GradientEditorDialog`) + Pattern Overlay (reuses `getPatternTile` + tile-via-getImageData) | `[x]` | +12 |
| C | Grow + Similar (color flood / non-contiguous match) + Defringe (nearest-opaque-neighbor RGB blend) + Remove White/Black Matte (premultiplied inversion `F = (C − M·(1−a)) / a`) + Smart Radius (Sobel × per-pixel radius modulation in Refine Edge) | `[x]` | +11 |
| D | Shared `src/tools/snap.ts` (`snapPoint(point, candidates, hysteresis)`) consumed by `move.ts`, `selectionMove.ts`, `shapes.ts`, `FreeTransformOverlay.tsx`, plus magenta smart-guide overlay in Viewport via `viewSlice.activeSnapTargets` | `[x]` | +13 |
| E | STAB-02 autosave recovery (retry-once OPFS→localStorage fallback, corrupt-slot clearing, Recover/Discard banner, `isDirty` + `lastSavedHistoryTick` dirty-state in `documentSlice`, status-bar `● Unsaved changes` indicator, New/Open confirm-on-dirty) + STAB-03 (`MAX_DOC_PIXELS = 60M` hard guard, `SOFT_DOC_PIXELS = 36M` soft warning, guarded `newDocument` / `openImageAsDocument` / `resizeImage` / `resizeCanvas` with roll-back on alloc throw) | `[x]` | +15 |

### Batch 5 - Audit-flagged correctness + UI completeness — SHIPPED 2026-05-12 (afternoon)

Final test count: **587/72 → 642/77** (+55, +5 files). 0 lint errors. All five slices integrated cleanly. Per-slice detail in [CHANGELOG.md](CHANGELOG.md). Spawned from the 2026-05-12 deep-audit pass (63 confirmed gaps across 6 parallel read-only audits). Five parallel agent slices, each bundling related P0/P1 items so a single integrator window closes them together.

| Agent | Slice | Scope (P0 + bundled P1s) |
|---|---|---|
| A | **Adjustment selection-awareness + mask density in destructive ops** | `AdjustmentApplyContext` extended to carry `selectionMask` + `dirtyRect` (mirror filter shape); `applyAdjustmentToTarget` and `applyFilterToLayer` honor `mask.density / mask.feather` during destructive commits. Files: `src/adjustments/applyAdjustment.ts`, `src/adjustments/Adjustment.ts`, `src/filters/applyFilter.ts`, `src/store/layersSlice.ts`. |
| B | **Group effects + Gradient Overlay UI + Stroke effect dash/cap/join + effect-fidelity polish** | `Canvas2DCompositor.renderGroup` renders `group.effects`; Properties Gradient Overlay editor exposes `angle / scale / alignment`; `ShapeStroke` gains `dash / lineCap / lineJoin`; Drop Shadow `spread` rewritten as edge hardening (not multi-stamp); Inner Glow `choke` applied before blur; Pattern Overlay scale tiles seamlessly across canvas; Satin linear contour post-blur; Bevel altitude epsilon guard. |
| C | **Shape + Type transform preservation (Move Tool + Free Transform)** | Move Tool gets a `moveShapeTarget` branch that rewrites `shapeData` geometry (rect/rounded-rect/ellipse bounds; polygon center+radius+rotation; line endpoints) instead of rasterizing. `FreeTransformOverlay` gains a `layer.kind === 'shape'` branch. Live drags commit one history entry on `pointerUp` via `applyShapeEdit / applyTypeEdit`. Custom-shape `pathD` aspect-ratio fix. Type re-edit overlay applies `transform.rotation` CSS. Shape Combine/Subtract/Intersect/Exclude buttons wired through (no-ops today). |
| D | **Color Range modes + live preview + Transform Selection + Border/Smooth dialogs** | Color Range gains a Replace / Add / Sub / Intersect mode radio (currently only Replace) + a live preview canvas + Shift/Alt modifier-keyed sampling. New `TransformSelectionOverlay.tsx` lets the user scale/rotate the selection outline without moving pixels (`Select > Transform Selection` is currently a stub). `Border Selection…` and `Smooth Selection…` get numeric dialogs (Border is hardcoded to 1 px today). Defringe width persists across opens. |
| E | **UI shell completeness pass** | `NavigatorPanel.tsx` (mini-map with zoom rect) + `InfoPanel.tsx` (cursor canvas-coords + RGB/HSB readout) — both declared in `panelVisibility` today but unimplemented. Quick Mask Q-shortcut wired end-to-end (brush retargets to a red overlay; on exit, convert mask → selection). Custom swatches round-trip through localStorage + `.pwbdoc`. Status-bar cursor coords reported in canvas-space (not browser viewport) + active-tool label after the dirty indicator. Preferences UI-scale reapplied on app boot. `Tab` and `Shift+Tab` panel-hide shortcuts. Autosave banner uses theme tokens + `aria-live="assertive"`. Audit-fix the `isDirty` mutation paths so every pixel/layer change flips the badge. |

### Batch 6 - Perf + path persistence + Type/Shape & Adjustments completeness + P2 polish — SHIPPED 2026-05-12 (evening)

Final test count: **642/77 → 701/86** (+59, +9 files). 0 lint errors. TypeScript clean. All five slices shipped. Per-slice detail in [CHANGELOG.md](CHANGELOG.md). Picks up the items that didn't fit Batch 5:
- Dirty-rect plumbing into compositor + Gaussian Blur / Median / Surface Blur (perf — biggest single payoff on large canvases). *(Batch 6 Slice A — SHIPPED 2026-05-11: `Canvas2DCompositor` gained `unionDirtyRect()` + a clipped-composite path that, when every visible layer reports a non-full `dirtyRect`, walks only the union (padded by 1 px). `markFrameClean` resets every layer's `dirtyRect` to null after every render. Adjustment layers / channel post-process / cleared frame buffer / first render still take the legacy full-frame path to preserve correctness. `applyFilter.ts` threads `layer.dirtyRect` into `FilterApplyContext`. Gaussian Blur, Box Blur, Surface Blur, and Median now honor `context.dirtyRect`: the separable convolution helper walks an extended row+col range (`±radius`) so the vertical/window pass still sees correct neighbours, output pixels outside the rect are copied straight through from `src`. With `dirtyRect=null` every filter falls back to its legacy full-canvas walk (regression-guarded in the new test). New tests: `src/test/dirtyRectPerf.test.ts` (+12).)*
- Path persistence (`pathStore.paths` round-trip through `.pwbdoc`) + Pen-tool Shape-mode → shape-layer integration + `Type > Convert to Shape`. *(Batch 6 Slice B — SHIPPED 2026-05-11: `DocumentManifest` extended with `paths?: PathShape[]` + `activePathId?: string | null`; `saveDocument` serializes `getPaths()` + `getActivePathId()`; `loadDocument` calls a new `clearPaths()` helper then `addPath()` + `setActivePath()` to restore them. `commitPathToActiveLayer` in `pen.ts` now branches by mode: Shape mode calls a new `createShapeLayerFromPath(path, color)` that normalizes the bezier curves into the 100x100 `CUSTOM_SHAPE_VIEWBOX` along the dominant axis (`pathToCustomShapeData`) and creates a `kind: 'shape'` layer via `executeDocumentCommand`. `Type > Convert to Shape` now calls a new `convertActiveLayerToShape()` in `typeCommands.ts` that uses a new `traceLayerToPathD()` in `textToPath.ts` (alpha-trace → SVG M/L/Z pathD scaled into the 100x100 viewBox) and rewrites the active layer in place to `kind: 'shape'` with the traced pathD; the action snapshots `kind/typeData/shapeData/pixels` so undo round-trips. New `Edit > Stroke Path…` / `Edit > Fill Path…` menu entries fire `photoweb:open-stroke-path` / `photoweb:open-fill-path` window events; `App.tsx` mounts new `StrokePathDialog` (size/color/opacity) + `FillPathDialog` (foreground/background/color + opacity). Both delegate to `src/tools/pathPaint.ts`'s `strokeActivePath` / `fillActivePath` which trace the active path with Canvas2D bezier ops, paint into the active layer, and commit a single `pixel`-kind history entry. `PathsPanel` gained row-level Stroke Path + Fill Path buttons. New tests: `src/test/pathPersistence.test.tsx` (+3), `src/test/penShapeMode.test.ts` (+4 — pen shape/path mode + Convert to Shape + undo), `src/test/strokeFillPath.test.tsx` (+5). Existing `penModes.test.ts > shape mode` updated to assert the new shape-layer behavior instead of in-place pixel rasterization.)*
- Type/Shape UI completeness: Paragraph indents/spacing, All Caps/Small Caps toggles, FontPicker shared store source, vertical type per-char metrics + baseline-shift axis, type style-runs UI. *(Batch 6 Slice C — SHIPPED 2026-05-12: Paragraph indents/spacing already in panel; All Caps / Small Caps already in CharacterPanel; FontPicker now accepts `layerId` and reads font from store so Character + Properties pickers share state; Properties Type section gained `Text Mode: Point | Paragraph` toggle; vertical type renderer rewritten to walk per-character measured advance with baseline-shift mapped to horizontal offset; +9 tests in `src/test/typeShapeUIBatch6.test.tsx`.)*
- Adjustments completeness: Selective Color (new), `Brightness/Contrast` `useLegacy` toggle in UI, Channel Mixer + Black & White Properties UI, Color Balance preserveLuminosity clamp, Smart Sharpen mode-difference test. *(Batch 6 Slice D — SHIPPED 2026-05-11: `src/adjustments/selectiveColor.ts` registers a new `selective-color` adjustment (9-range × CMYK × Relative/Absolute) with hue-windowed chroma weighting + lightness-windowed white/neutral/black weighting + per-pixel RGB↔CMYK round-trip; registered in `index.ts` and wired into `Image > Adjustments` and `New Adjustment Layer` menus. `PropertiesPanel.tsx` gained typed adjustment-param metadata so Brightness/Contrast (`useLegacy`), Channel Mixer (output channel + R/G/B/Constant sliders + Monochrome), Black & White (6 color sliders + Tint + Tint Color), Selective Color (Colors range + CMYK sliders + Method), and Color Balance (Tone + 3 sliders + Preserve Luminosity) all render structured rows for adjustment-layer live editing. `AdjustmentDialog.tsx` gained the Brightness/Contrast `Use Legacy` checkbox and a Selective Color dialog case. Color Balance preserve-luminosity correction now clamps to `[-255, 255]` before subtraction so extreme Cyan-Red shifts on white stay near white. New tests: `src/test/selectiveColor.test.ts` (+6), `src/test/smartSharpenModes.test.ts` (+2), `src/test/colorBalanceClamp.test.ts` (+4).)*
- P2 polish: Magic Eraser cursor, Pencil pressure, Clone scale/rotate source, vertical type baseline, missing filters (Dust & Scratches / Despeckle), various small UX rough edges.

### Batch 4 - Polish And Nice-To-Have — SHIPPED 2026-05-12 (morning), one slice deferred

Final test count: **587 passing across 72 files** (up from 557/69). Lint: **0 errors** (down from 3 — `StrokeControls` hoist eliminated the carried `react-hooks/static-components` violations).

| Agent | Slice | Status | Tests added |
|---|---|---|---|
| A | Bevel & Emboss (4 styles × height-map + Sobel + Phong lighting) + Satin (symmetric distance fold + linear/cone/gaussian contours) + Layer Style copy/paste/clear/scale via Properties + `Layer > Layer Style` submenu (`copiedLayerStyle` in-memory clipboard + Scale Effects dialog) | `[x]` | +13 |
| B | `Edit > Fill…` / `Edit > Stroke…` / `Filter > Fade Last…` dialogs | `[~]` deferred | +9 (in worktree, not main) |
| C | Brush Presets panel + Pattern Presets panel (rename / reorder / duplicate / drag-reorder) + custom shape library (`ShapeCustomData` variant + 8 built-in shapes: heart, star-5pt, star-7pt, arrow, lightning, speech-bubble, gear, checkmark) + Path2D-based `drawCustomShape` renderer | `[x]` | +10 |
| D | Searchable FontPicker (live preview + arrow-key nav + Esc/Enter) + missing-font fallback with one-shot toast per layer-session + accessibility pass on all 17 dialogs (role=dialog + aria-modal + aria-labelledby + first-focus + Tab focus-trap + Esc-close via shared `useDialogA11y` hook + aria-labels on every toolbar button) + StrokeControls lint refactor (hoisted out of ShapeSection) | `[x]` | +7 |

**Carry-forward to a future integrator slice**:
- Agent B's worktree at `.claude/worktrees/agent-a03aa3bc7382876b7` ships `FillDialog.tsx`, `StrokeDialog.tsx`, `FadeFilterDialog.tsx`, `dialogStyles.ts`, `fillStrokeEngine.ts`, and `editFillStrokeFade.test.tsx` (9 tests). The worktree was forked from a pre-Batch-1 base, so clean integration requires:
  1. Copying the 6 new files into main.
  2. Adding `selectionMaskAlpha(selection, w, h)` to `src/utils/selectionUtils.ts`.
  3. Adding `dilateMask` / `erodeMask` / `strokeRingMask` helpers in a NEW file `src/core/maskOps.ts` (do NOT overwrite main's `src/effects/stroke.ts` which is the layer-effect renderer).
  4. Adding `lastFilter` / `lastFilterSnapshot` / `lastFilterLayerId` slots to main's `panelsSlice`.
  5. Capturing `getImageData` in main's `src/filters/applyFilter.ts` before each filter runs.
  6. Enabling `Edit > Fill…` / `Edit > Stroke…` / `Filter > Fade Last…` in `MenuBar.tsx`.
  7. Mounting the three dialogs in `App.tsx`.

## Per-Slice Development Loop

Follow the canonical loop in [CLAUDE.md §5 SOP](../../CLAUDE.md#5-standard-operating-procedure-every-task). Parallel-track work additionally requires:

1. **Pick one or two backlog rows from a single Track**, not a broad family across Tracks.
2. **Stay inside your Track's write ownership.** If you need to edit a shared chokepoint file (`PropertiesPanel.tsx`, `types.ts`, `layersSlice.ts`, `Canvas2DCompositor.ts`, `App.tsx`, persistence serializers, global shortcut routing), pause, request the integrator window, and merge that edit as a single coordinated PR.
3. **Match test naming to user cases.** The test name should read like the user case ("clicking Define Pattern saves a tile and selects it as active"). Reference the case ID in the test description when it helps reviewers.
4. **Add the four required tests** (per CLAUDE.md §5): happy path, undo/redo, persistence (if durable schema changes), selection+mask clipping (if pixel op).
5. **Update backlog status, user-case wording, and this plan only after tests pass.** Update this plan only when dependencies, scope, or parallel ownership changes — not for every implementation step.

## Active Gaps Worth Recording

Past per-batch shipped status lives in [CHANGELOG.md](CHANGELOG.md). The list below is only items that remain partial or pending and that future agents should know about before picking up adjacent work.

- **Move-Tool / Free Transform path for shape layers** (`SHAPE-01` follow-up): the current path still rasterizes on transform commit. To preserve editability, the transform handler must rewrite `shapeData` geometry (rect bounds, ellipse bounds, polygon center/radius, line endpoints) instead of stamping pixels.
- **`Edit > Fill…` / `Edit > Stroke…` / `Filter > Fade Last…` dialogs** (Batch 4 deferred): worktree at `.claude/worktrees/agent-a03aa3bc7382876b7` ships the 6 files needed. Integration checklist is documented in the Batch 4 SHIPPED section above.
- **Dirty-rect plumbing in compositor and filters**: schema is in place (`Filter.context.dirtyRect`, `Layer.dirtyRect`); paint history is stroke-bbox-tight; but no individual filter or the compositor reads the dirty rect. Real perf gap on large canvases.
- **`SEL-02` smart-radius beyond the Sobel modulation that shipped**: decontaminate plus per-pixel hair-edge refinement are still missing. The current Smart Radius is good enough for soft-edge regions, weaker for fine hair.
- **Preset panel polish**: brush + pattern presets can be saved / applied / renamed / reordered / removed, but import/export of preset packs (Photoshop `.abr` / `.pat`) is not implemented and intentionally out of near-term scope.
- **Bevel & Emboss / Satin contour presets**: ship with linear / cone / gaussian curves; Photoshop has a 12-preset library that is out of scope.
- **Style preset libraries** (named bundles of multiple effects applied as a single click): not implemented; copy-paste of a single layer's effects is the current closest analog.

## Documentation Maintenance

After each major batch:
- Update [photoweb-implementation-backlog.md](photoweb-implementation-backlog.md) first.
- Update [photoweb-user-cases.md](photoweb-user-cases.md) only for user-visible status changes.
- Update [photoweb-development-plan.md](photoweb-development-plan.md) when milestones or current focus change.
- Update comparison docs only when the implementation materially changes the Photoshop-vs-Photoweb assessment.
- Keep historical audit lists separate from active backlog so future agents do not mistake closed bugs for new work.
