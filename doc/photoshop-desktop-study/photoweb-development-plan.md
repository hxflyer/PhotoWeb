# Photoweb Development Plan

Purpose: continue Photoweb as a focused browser-based photo editor, using the Photoshop comparison documents as a feature source while intentionally excluding features that do not fit this project.

Decision source: user Q&A on 2026-05-10.

Last implementation sync: 2026-05-12 (evening). The 2026-05-11 audit-sweep (18 BUGs + 15 GAPs), the 2026-05-12 deep-audit pass (63 confirmed gaps), and six parallel-plan batches have all shipped: **701 tests passing across 86 files, 0 lint errors, TypeScript clean**. Per-batch detail lives in [CHANGELOG.md](CHANGELOG.md); active backlog in [photoweb-implementation-backlog.md](photoweb-implementation-backlog.md); parallel-track ownership and remaining gaps in [photoweb-parallel-development-plan.md](photoweb-parallel-development-plan.md).

Parallel implementation plan: use [photoweb-parallel-development-plan.md](photoweb-parallel-development-plan.md) to split remaining work safely across shape, type, retouch, selection, effects, guides/presets, and stability tracks.

Current implemented foundation:
- History now uses a full timeline with an active cursor, visible redoable future states, undo/redo shortcuts, document snapshots that restore real state, configurable max history size, and undo coverage for high-use operations including mask paint strokes (first-class history actions).
- Layer system: groups, group collapse/expand, group-aware compositing, multi-layer selection, group/ungroup, align/distribute, mask thumbnails, mask enable/disable/link/unlink/apply/delete, plus non-destructive density (0–100%) and feather (0–250 px) at composite time.
- Properties panel: mounted in the right dock and toggleable via Window > Properties. Active-layer-aware sections render conditionally per kind: Layer (name/dimensions/opacity/fill), Mask (density/feather/enabled/linked), Adjustment (live param editing for every adjustment kind), Fill (solid color and gradient type/angle live re-render), Effects (add/remove/toggle/edit).
- Mask paint mode: clicking the mask thumbnail focuses the mask paint target (with a visible frame); brush, eraser, and pencil retarget into `layer.mask.canvas`. Alt-click toggles enabled. Compositor converts mask RGB luminance to alpha so masks correctly hide pixels (a structural bug fixed). `Layer > Layer Mask > Reveal Selection / Hide Selection` are functional.
- Selection correctness: `Shift+Alt` intersect is true set intersection (raster AND); Expand/Contract use real iterative dilation/erosion; Smooth uses a real median filter; Inverse uses canvas bounds (no hardcoded 500-pixel pad); Save Selection and Load Selection dialogs are functional. Refine Edge applies Radius (blur), Smooth (median), and Contrast (steepen) on top of Feather and Shift Edge.
- Selection move-by-drag: clicking inside an existing selection enters drag-to-translate mode; mouse-down outside dismisses immediately. Uniform across marquee, lasso, polygonal lasso, magic wand, and quick selection.
- Tool option-bar wiring debt closed: Eraser modes (Brush/Pencil/Block), Dodge/Burn Range + Exposure, Sponge Mode + Vibrance, Brush Smoothing, Pencil Spacing, Marquee Feather + AA, Gradient Smooth/Classic + Transparency, Crop overlay variants + Straighten, Pen Path/Shape/Pixels modes, Clone Stamp Show Overlay/opacity/Reset Source — all functional and writing through the store.
- Layer effects: Drop Shadow, Stroke (outside/center/inside), and Color Overlay render in the compositor. Inner Shadow / Outer Glow / Inner Glow / Pattern Overlay / Gradient Overlay / Bevel & Emboss remain missing and are deferred.
- Non-destructive adjustments: `Image > New Adjustment Layer >` submenu creates editable adjustment layers for every adjustment kind. Destructive `applyAdjustmentToLayer` and `applyFilterToLayer` honor `layer.mask` combined with the active selection.
- Keyboard / workspace polish: single-letter tool shortcuts globally bound; Shift+key cycles tool groups (Brush↔Pencil, Rect↔Ellipse marquee, Lasso↔Poly, Quick↔Magic Wand, Bucket↔Gradient, Type H↔V, Pen↔Freeform, Direct↔Path Selection, shape variants, Dodge↔Burn↔Sponge). `Cmd+/` opens a keyboard shortcut reference dialog. Window menu panel toggles persist to localStorage. Channels panel R/G/B visibility eyes hide channels from the composite.
- Persistence: `.pwbdoc` round-trips layer mask (with density/feather), typeData, adjustment params, fillData, layer effects, locks, and color tag. Backwards-compatible with v1 manifests.
- Type layers: `typeData` stored on commit; double-click re-edit works; Move Tool and free transform preserve the source. Character, Paragraph, and Properties panels edit selected type layers; Properties-side undo coverage still needs a follow-up.
- Next major development area: integrator slice for the deferred `Edit > Fill…` / `Edit > Stroke…` / `Filter > Fade Last…` dialogs (worktree preserved); Move-Tool / Free Transform preservation of shape-layer geometry; dirty-rect plumbing into compositor + individual filters; and Photoshop-polish carry-forward (contour-curve presets, named style libraries, OpenType / Glyphs panels). Editable shape layers + shape Properties, Type Properties undo coverage, the full retouch family (Magic / Background / Spot Healing / Healing Brush / Patch / Red Eye), all 7 layer effects + style copy-paste-scale, draggable guides + snap-to-everything + smart guides, Brush / Pattern / Gradient preset systems, FontPicker, accessibility on all dialogs, Preferences, Storage Usage with autosave recovery + memory guardrails, Smart Sharpen modes, polygon star + line arrowheads, custom shape library, and dirty-rect-tight paint history are all shipped.

2026-05-11 source-review corrections from the 549 notes:
- Do not treat the old "wiring debt" review as current. Many former gaps are now closed: mask paint, Window toggles, Channels visibility, tool option wiring, real selection intersect/modify ops, Properties panel mounting, editable adjustment/fill/mask/effect params, three layer effects, and live-layer persistence.
- The most misleading remaining gaps are workflows where UI already exists or the Photoshop notes create a strong user expectation: Select and Mask output target, editable shape layers, pattern fill source, Define Pattern, brush presets, draggable guides, and Type controls inside Properties.
- Retouch tools remain genuinely missing rather than half-wired: Spot Healing, Healing Brush, Patch, Red Eye, Background Eraser, and Magic Eraser.

## Known Bugs and Outstanding Gaps (2026-05-11 source audit) — all closed

A second pass through the 549 source notes against the post-Phase-0–7 source surfaced concrete bugs and remaining in-scope gaps. All 18 BUGs and 15 GAPs listed below shipped in the 2026-05-11 development sweep. Tracked as `BUG-*` / `GAP-*` rows in the implementation backlog with implementation notes.

### Bugs in shipped features

P0 — user notices immediately:
- **BUG-01 Selection feather is not applied during filter/adjustment apply.** [src/filters/selectionMask.ts](../../src/filters/selectionMask.ts) rasterizes ops without reading `sel.feather`. Marching ants reflect feather (Viewport's `superFastBlurToFloat32`), but adjustments and filters that go through `buildSelectionMask` ignore it. User sees feathered selection, then a hard-edged result.
- **BUG-02 Paint Bucket "Pattern" source falls back to foreground.** [src/tools/paintBucket.ts](../../src/tools/paintBucket.ts) never reads `options.source`. UI shows `Pattern`, click does nothing different.
- **BUG-03 Saved selections do not survive `.pwbdoc` save/load.** `savedSelections` is not in the document manifest.

P1 — visible inconsistency or workflow blocker:
- **BUG-04 Effect blend-mode parameter not exposed in the Properties panel** (Drop Shadow / Stroke / Color Overlay each carry a `blendMode` the user can't change).
- **BUG-05 Refine Edge "Output: New Layer With Mask" label is misleading.**
- **BUG-06 Load Selection dialog lacks Add/Subtract/Intersect modes.**
- **BUG-07 Rectangular Marquee anti-alias toggle has no effect.**
- **BUG-08 High Pass filter pollutes the alpha channel.**
- **BUG-09 Eyedropper default sample is `All Layers`** (Photoshop default is current-layer).
- **BUG-10 Type-layer rotation re-edit overlay is un-rotated.**
- **BUG-11 Shape stroke and the Stroke layer effect render simultaneously** (double-stroke when both used).

P2 — minor or edge case:
- **BUG-12 Color Picker hex display does not update on slider drag.**
- **BUG-13 Eraser block-mode spacing is hardcoded** at `size * 0.4`.
- **BUG-14 Paint Bucket anti-alias edge ring artifact** at low tolerance.
- **BUG-15 Warp overlay handle hit-detection is not zoom-scaled.**
- **BUG-16 Type faux bold/italic via CSS only** — rasterization may not match if font lacks weight variants.
- **BUG-17 Autosave triggers on a fresh blank document** (only checks `layers.length === 0`).
- **BUG-18 Gradient fill-layer custom stops not persisted** in `.pwbdoc`.

### In-scope gaps (beyond what's already in the backlog)

P0 / P1:
- **GAP-01 Define Pattern + pattern-preset registry** (underlying for BUG-02).
- **GAP-02 `Duplicate Layer` command disabled in the Layer menu** — no store action.
- **GAP-03 `fx` indicator on Layers-panel rows** when a layer has effects.
- **GAP-04 Brush preset system** — no save / load / picker for brush settings.
- **GAP-05 Star options on the Polygon tool.**
- **GAP-06 Arrowheads on the Line tool.**
- **GAP-07 `Type > Convert to Shape` / `Convert to Path`** (currently disabled).
- **GAP-08 Draggable guides + `New Guide` / `Clear Guides` + snap-to-guides feedback.**
- **GAP-09 Preferences dialog (`Edit > Preferences`).**
- **GAP-10 Storage Usage dialog** (`Edit > Preferences > Storage`).

P2:
- **GAP-11 Tool presets.**
- **GAP-12 Spring-loaded tool shortcuts.**
- **GAP-13 Smart Sharpen mode actually does something** (currently all modes are USM).
- **GAP-14 Gaussian-blur perf guardrail at extreme radius.**
- **GAP-15 PNG-encoded history compression** — landed as the simpler "tight dirty-rect" win: brush/eraser/pencil now commit only the stroke's bounding rect (with padding) instead of the full canvas, cropping the captured `before` buffer to match. Memory scales with stroke size, not canvas size.

Post-audit follow-ups shipped 2026-05-11:
- **GAP-07b Type / raster → Work Path** via marching-squares boundary trace (`src/tools/textToPath.ts`, `Type > Create Work Path`).
- **Pattern picker** in the Paint Bucket Options bar exposes `activePatternId`.

### Already underway (recent linter changes)
- **Color Range dialog** scaffolding: `panelsSlice.isColorRangeDialogOpen` + open/close actions.
- **Arrow-key selection-border nudge:** `nudgeSelectionBorderBy(dx, dy)` in `selectionMove.ts` with undo.
- **Type Properties section** in PropertiesPanel — `rerenderTypeLayer` import added; section being prepared.
- **Hide / Show Selection Edges** (`Cmd+H`): shipped via `viewSlice.showSelectionEdges`.

## Implementation order this session

Start with P0 bugs, then P1, then quick gaps. Verification after each: `npx tsc -b`, `npm test`, plus a new simulator test.

## Product Scope

Photoweb should be a browser photo-editing app, not a full Photoshop clone.

Core direction:
- Focus on photo editing, compositing, layers, masks, selections, retouching, text, shapes, guides, settings, brush presets, and stable history.
- Prioritize practical browser-native workflows over Adobe ecosystem parity.
- Prefer incremental, testable feature slices over large all-at-once systems.

Exclude for now:
- AI and generative features.
- Cloud collaboration, projects, accounts, and Adobe integrations.
- Print-production features: CMYK, spot colors, separations, printer resolution, print workflows.
- Video, timeline animation, frame animation, and animated export.
- Actions, batch processing, droplets, and automation.
- Help, documentation, release notes, FAQ, product-support pages.
- Multi-document tabs/windows.
- Smart Objects.
- Non-destructive Smart Filters until layer architecture is stronger.
- Content-Aware Fill, Remove Tool, automatic background removal, and other complex AI/content synthesis.
- PSD import/export compatibility.
- Advanced export improvements such as layer export, scaled exports, metadata basics, and professional format settings.
- Advanced brush dynamics.

## Must Have

- Reliable undo/redo/history for all editing operations.
- Strong layer system: groups, multi-select, align/distribute, masks, properties editing.
- Strong selection system: Color Range, better Select and Mask/refine edge, cleanup, defringe, expand/contract/smooth dialogs.
- Core retouch tools: Spot Healing, Healing Brush, Patch, Red Eye, Background Eraser, Magic Eraser.
- Layer styles/effects: shadow, stroke, glow, bevel, visibility/editing controls.
- Shape improvements: better vector-like shapes, arrows, star options, custom shape workflow where practical.
- Text improvements: better basic text workflow, but not advanced OpenType/glyph/international/dynamic text systems.
- Guides and snapping: draggable guides, grid/ruler preferences, smart-guide-like alignment aids.
- Settings dialog: app behavior, UI scale, grid, shortcuts, export defaults where relevant.
- Keyboard shortcut viewer and customization.
- Brush presets.
- Pattern fills and pattern presets.
- Performance/stability work: autosave reliability, browser storage diagnostics, meaningful error reporting.

## Nice To Have

- Lightweight command palette if it helps keyboard workflow.
- Basic local preset import/export for brushes, patterns, and layer styles.
- Better filter preview UX.
- Simple before/after comparison for adjustments and filters.
- Optional local project/session browser if it stays offline and simple.

## Milestones

### Milestone 0 - Foundation: History, Commands, And Reliability

Goal: make every future editing feature safely undoable and testable.

Current state:
- Completed for the core editor path. Photoweb now has `undo`, `redo`, `HistoryPanel`, snapshots, keyboard shortcuts, a global timeline stack, command helpers, document-snapshot commands, pixel history, and max-size pruning.
- Continue extending history coverage as each new feature is added.

Build:
- Maintain the full timeline plus active cursor, so the History panel can show past and redoable future states clearly.
- Ensure every new document-mutating command records a history action: properties, text edits, shape edits, guide edits, settings changes, and future feature work.
- Use compound history actions for multi-step operations when needed.
- Keep adding undo/redo tests for each major operation family.
- Add storage/quota error diagnostics and clearer save/autosave failure messages.

Deliverables:
- Robust History panel. `Implemented`
- Command/history infrastructure. `Implemented`
- Undo/redo test coverage for high-use operations. `Implemented`
- Autosave and storage reliability improvements.

### Milestone 1 - Layer System Upgrade

Goal: make Photoweb comfortable for real layered editing.

Current state:
- Core layer organization is implemented: groups, multi-select, group selected layers, ungroup, collapse/expand, group visibility/opacity, group-aware compositing, align/distribute, and visible mask controls.
- Remaining work is polish and deeper Photoshop parity, not the first usable version.

Build:
- Polish layer groups with drag/drop into groups, safer nested-group UX, and better reorder semantics.
- Extend multi-layer selection into more operations such as transform/move/delete/duplicate where appropriate.
- Align and distribute selected layers. `Implemented`
- Layer duplicate improvements.
- Layer color labels and lock behavior polish.
- Better mask thumbnail UI and clear mask state indicators. `Implemented`
- Group-aware compositing. `Implemented`
- Layer context menu cleanup.

Dependencies:
- Milestone 0 history model.

Deliverables:
- Layer groups. `Implemented`
- Multi-select layers. `Implemented`
- Align/distribute. `Implemented`
- Stronger Layers panel UX. `Partially implemented; continue polish`

### Milestone 2 - Properties Panel

Goal: make existing layer types editable after creation.

Current state:
- Active-layer-aware Properties panel mounted; Layer / Mask / Adjustment / Fill / Effects sections render per layer kind.
- Adjustment layers: every kind (B/C, Levels, Curves, Hue/Sat, Color Balance, Vibrance, B&W, Photo Filter, Channel Mixer, Gradient Map, Invert, Posterize, Threshold) is editable live with re-render on change.
- Fill layers: solid color picker is live; gradient type and angle re-render on change.
- Mask: density (0–100 %) and feather (0–250 px) apply non-destructively at composite time.
- Type: Properties panel basics are implemented for selected type layers: text, font family, size, color, alignment, and orientation. Paragraph panel remains the richer paragraph surface.
- Shape: shape tools still rasterize on commit, so shape-layer editing of stroke width, corner radius, polygon sides, etc. is still pending.

Build (remaining):
- Add undoable command wrapping for Properties-side type edits and expand paragraph basics if needed.
- Edit shape fill, stroke, stroke width, corner radius, polygon sides, line weight (also requires a real shape layer kind).

Deliverables:
- Real Properties panel connected to active layer type. `Implemented`
- Existing adjustment/fill layers become editable. `Implemented`
- Mask density and feather. `Implemented`
- Type layers become editable from Properties. `Implemented for basics; undo coverage pending`
- Shape layers as first-class editable kind. `Pending`

### Milestone 3 - Selection And Mask Refinement

Goal: make selections good enough for precise photo editing without AI.

Current state:
- Intersect (Shift+Alt) is true raster AND. `Implemented`
- Expand, Contract, Smooth use real distance-map / median operations. `Implemented`
- Inverse uses canvas bounds (no padding hack). `Implemented`
- Refine Edge dialog applies Radius (blur), Smooth (median), Contrast (steepen), Feather, and Shift Edge. `Implemented`
- Save Selection / Load Selection dialogs. `Implemented`
- Mask paint via brush/eraser/pencil with first-class history; `Layer > Layer Mask > Reveal/Hide Selection` menu commands. `Implemented`
- Mask density/feather as non-destructive per-mask controls. `Implemented`
- `applyAdjustmentToLayer` and `applyFilterToLayer` honor `layer.mask` combined with the active selection. `Implemented`

Build (remaining):
- Color Range dialog with add/subtract samples, fuzziness, and selection output. `Implemented; direct canvas eyedropper and skin/localized presets remain future polish`
- Move selected pixels with the Move Tool when a selection exists; keep selection-border movement with selection tools separate. `Implemented`
- Add arrow-key nudging for selected pixels and selection borders. `Implemented`
- Hide/show selection edge rendering without clearing the selection. `Implemented`
- Refine Edge advanced: smart radius (per-pixel adaptive feather along the gradient) and decontaminate (color defringe).
- Defringe, remove white matte, remove black matte commands.
- Border dialog UI (the underlying op exists).

Excluded:
- Select Subject, Select People, Object Selection AI, Refine Hair AI, automatic object masks.

Deliverables:
- Strong non-AI selection workflow. `Largely implemented; remaining: smart refine/output destinations + matting cleanup`
- Better mask creation from selections. `Implemented`

### Milestone 4 - Retouch Tools

Goal: add practical manual/non-AI photo cleanup tools.

Build:
- Spot Healing Brush using local neighborhood sampling.
- Healing Brush with sampled source plus tone/color blending.
- Patch Tool using selection source/destination workflow.
- Red Eye Tool.
- Background Eraser with tolerance, sampling, limits, and protect foreground color if practical.
- Magic Eraser using Magic Wand-like matching plus delete.
- Clone Stamp improvements: source overlay, scale/rotate source if feasible, better sample mode UI.

Excluded:
- Content-Aware Fill.
- Remove Tool.
- Automatic background removal.
- AI distraction removal.

Deliverables:
- Manual retouching toolset suitable for browser photo editing.

### Milestone 5 - Layer Styles And Effects

Goal: support common non-destructive visual styling.

Current state:
- Layer-effects data model + compositor pipeline + per-effect renderers in `src/effects/`. `Implemented`
- Drop Shadow (distance/angle/size/spread/color/opacity/blend mode). `Implemented`
- Stroke (outside/center/inside positioning, size, color, opacity, blend mode). `Implemented`
- Color Overlay (color, opacity, blend mode). `Implemented`
- Properties-panel Effects section: add/remove/toggle/edit. `Implemented`
- `.pwbdoc` round-trips effects on save/load. `Implemented`

Build (remaining):
- Inner Shadow, Outer Glow, Inner Glow.
- Gradient Overlay, Pattern Overlay.
- Bevel & Emboss, Satin.
- Copy / paste / clear layer styles, Layers-panel `fx` indicator.
- Scale Effects.
- Preset styles.

Dependencies:
- Milestone 0 history. `Implemented`
- Milestone 2 Properties panel. `Implemented`

Deliverables:
- Common layer effects usable on raster/type/shape layers. `Drop Shadow + Stroke + Color Overlay shipped; remaining effects pending`

### Milestone 6 - Shapes, Paths, And Text Basics

Goal: improve design tools while avoiding advanced typography.

Build:
- Better shape layer behavior instead of mostly pixel drawing.
- Shape/path/pixels mode behavior made real or simplified honestly; until editable shape data exists, do not present raster output as fully editable Shape mode.
- Star options on Polygon tool.
- Arrowheads for Line tool.
- Custom shape presets if practical.
- Better path/shape selection and editing.
- Text quality improvements: reliable edit/move/resize/rotate, paragraph basics, better font picker, font search if browser-supported.
- Fill text with image through clipping/mask-style workflow if feasible.

Excluded:
- OpenType feature panel.
- Glyphs panel.
- Dynamic text.
- Text on path unless it becomes low-cost after path improvements.
- International text engine controls.

Deliverables:
- Better practical shapes and text for image design.

### Milestone 7 - Guides, Snapping, And Workspace Settings

Goal: make layout and precision editing easier.

Current state:
- Draggable horizontal/vertical guides with add/move/remove/clear. `Implemented`
- Snap toggle (`viewSlice.snapEnabled`). `Implemented`
- Preferences dialog with history max size, autosave interval, UI scale. `Implemented`
- Storage Usage dialog with quota estimate + per-layer/history memory breakdown. `Implemented`
- Keyboard shortcut viewer (`Cmd+/`). `Implemented`

Build (remaining):
- New Guide dialog (numeric positioning).
- Lock guides.
- Smart-guide-like alignment hints for layer bounds and centers.
- Shortcut customization stored locally.

Deliverables:
- Precision layout aids. `Implemented (draggable guides + clear/move/remove + snap toggle)`
- First real Preferences/Settings dialog. `Implemented`

### Milestone 8 - Brushes, Patterns, And Presets

Goal: improve creative painting/fill without advanced dynamics.

Current state:
- Brush preset save/apply/remove with localStorage persistence; `Define Brush Preset…` menu. `Implemented`
- Tool preset save/apply/remove (generic options blob per tool). `Implemented`
- Pattern preset model with tile capture, in-memory tile cache, and localStorage round-trip. `Implemented`
- `Edit > Define Pattern…` captures selection bounds or full active layer. `Implemented`
- Paint Bucket pattern picker and tile fill (no FG fallback when pattern selected). `Implemented`

Build (remaining):
- Rename / reorder brush presets in a preset panel UI.
- Pattern fill layer kind (compatible with fill layer model).
- Basic import/export of Photoweb brush/pattern presets.

Excluded:
- Advanced brush dynamics, scattering, texture, dual brush, mixer brush.

Deliverables:
- Brush presets. `Implemented (save/apply/remove)`
- Pattern fills and pattern presets. `Implemented for Paint Bucket; fill layer kind pending`

### Milestone 9 - Performance And Stability

Goal: keep the app reliable as feature complexity grows.

Current state:
- Brush / Eraser / Pencil commit history with stroke-bbox-tight `dirtyRect` (plus brush-radius padding), and `cropImageData` keeps the captured before-buffer to that rect. Memory scales with stroke size, not canvas size. `Implemented`
- Storage Usage dialog with `navigator.storage.estimate()` + per-layer/history memory breakdown. `Implemented`
- Autosave gated on `lastAutosaveHistoryTick` so a fresh blank document doesn't trigger autosave. `Implemented`

Build (remaining):
- Dirty-rect plumbing in filters and the compositor (currently both still walk full image / recompose full frame).
- Canvas memory guardrails before creating/opening oversized documents.
- Browser storage quota diagnostics (toast + actionable message when quota fails).
- Autosave reliability tests covering reload + failure scenarios.
- Clear recovery flow after save/load/autosave failures.
- Performance profiling for compositor, filters, brush strokes, masks, and history.
- Optional Web Worker offloading for expensive filters if needed.

Deliverables:
- More stable large-image editing.
- Better user-facing diagnostics.

## Exclude For Now

These should not appear in near-term implementation tickets:
- AI generation, Firefly, neural filters, generative fill/expand/upscale, harmonize, reflection removal.
- Cloud documents, collaboration, projects, account sync.
- Print, CMYK, spot colors, ICC workflow, printer resolution.
- Video, animation, timeline, keyframes, video export.
- Actions, batch processing, droplets, scripting.
- Help/release notes/FAQ/product support features.
- Smart Objects and Smart Filters.
- PSD/PSB/PDF/TIFF professional compatibility.
- Export layer files, scaled exports, metadata/content credentials.

## Suggested Execution Order

1. Treat Milestone 0 as implemented foundation and keep extending history tests for every new feature.
2. Treat Milestone 1 as implemented core layer foundation; continue polish opportunistically.
3. Build the remaining Milestone 3 parity gaps first: honest Select and Mask output behavior, smart refine, and matting cleanup. Move Tool selected-pixel movement, selection-edge visibility, arrow-key nudging, and Color Range are complete.
4. Finish the Milestone 2 user-facing gaps that current UI already implies: shape-layer Properties behavior and undo coverage for Properties-side type edits.
5. Build Milestone 4 retouching after selection and mask behavior is reliable, because healing/eraser tools depend on selection clipping and undo.
6. Build the editable shape-layer work from Milestone 6 before adding more shape UI polish.
7. Build Milestones 5, 7, and 8 based on user-facing priority after the selection/type/shape expectation gaps are closed.
8. Run Milestone 9 continuously, not only at the end.

## Completed Epics

- `Reliable History And Command System` (Milestone 0).
- `Layer Properties Editing` core (Milestone 2 — adjustment / fill / mask params editable; type basics editable; shape and Properties-side type undo still pending).
- `Selection And Mask Refinement` core (Milestone 3 — intersect / expand / contract / smooth / inverse / save+load / refine-edge sliders / Color Range / honest output destinations; smart radius pending).
- `Layer Effects` minimal set (Milestone 5 — Drop Shadow / Stroke / Color Overlay; remaining styles pending).
- `Wiring-debt sweep`: every option-bar control now writes through to the engine; selection move-by-drag uniform across selection tools; tool-group Shift-cycling; Cmd+/ shortcut viewer; Window-menu panel toggles persisted; Channels visibility eyes; mask-from-selection; non-destructive adjustment-layer creation.
- `2026-05-11 audit sweep` (Milestones 7, 8, plus partial Milestone 9): all 18 BUG-* and 15 GAP-* items from the 2026-05-11 source audit shipped. Draggable guides + clear/move/remove + snap toggle; Preferences dialog (history max size, autosave interval, UI scale); Storage Usage dialog; brush presets; pattern presets + Paint Bucket pattern fill; polygon star; line arrowheads; Smart Sharpen actually-distinct modes; Eraser block-mode spacing; type rotation hit-test + faux bold/italic skew; effects blend-mode and position exposed in Properties; `fx` indicator on Layers panel; Duplicate Layer; Refine Edge honest output destinations; Saved Selections round-trip in `.pwbdoc`; Load Selection modes (replace/add/sub/intersect); rectangular Marquee anti-alias and selection from-center; High Pass premultiplied alpha; autosave gating; Eyedropper current-layer default; tool presets; text-to-path via marching squares; dirty-rect-tight paint history.

## First Implementation Epic

Completed first epic: `Reliable History And Command System`.

Why:
- It supports every future feature.
- Undo/redo is explicitly required.
- The current history system is now strong enough for continued feature work, with the caveat that every new mutating feature must use the command/history path.

Initial tickets:
- Create full history timeline with active cursor. `Implemented`
- Show redoable future states in History panel. `Implemented`
- Add command wrapper for document/layer/selection/pixel/property actions. `Implemented`
- Convert high-use operations to command/history actions. `Implemented`
- Add tests for undo/redo: brush stroke, filter, adjustment, layer add/remove, layer reorder, layer property, selection change, transform, mask add/apply/delete. `Implemented`
- Fix snapshot restore behavior. `Implemented`
- Add history max-size setting. `Implemented`
- Add keyboard shortcut customization later in Settings milestone, but keep `Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`, and `Cmd/Ctrl+Y` reliable now. `Shortcut customization pending`

## Next Implementation Epic

Recommended next epic: `Selection Parity And Type/Shape Consolidation`, with `Memory & Storage Diagnostics` in parallel if capacity allows.

Why:
- The source has moved beyond the old foundation gaps. The next user-visible failures are not architecture problems; they are parity gaps in workflows users try immediately after making a selection, creating text, or drawing a shape.
- Adjustment / fill / mask / effects properties are editable; type can be edited through Character/Paragraph panels and basic Properties controls.
- Shape tools still draw raster content despite Shape-mode UI, which is a bigger user-expectation mismatch than another effect renderer.
- History memory remains uncompressed; PNG-encoded pixel-history buffers and storage diagnostics remain well-scoped stability work.

Initial tickets:
- `SEL-MOVE-01` Move Tool moves selected pixels, not the entire layer, when a selection exists; outside-selection pixels remain in place; undo/redo restores both. `Implemented`
- `SEL-EDGE-01` View > Show > Selection Edges toggles marching ants only; selection remains active. `Implemented`
- `SEL-NUDGE-01` Arrow keys nudge selection borders or selected pixels; Shift+arrow nudges by 10 px. `Implemented`
- `SEL-01` Color Range dialog with sampled colors, add/subtract samples, fuzziness, and selection output. `Implemented`
- `TYPE-01` Properties-panel Type section for selected type layers. `Implemented for basic whole-layer controls; undo coverage for Properties-side edits still pending`
- `SHAPE-01` Real shape-layer data model; fill/stroke/geometry changes rerender and remain undoable. `Pending — single largest user-expectation gap left in the editor`
- `SHAPE-UI-01` Disable or relabel shape UI that implies editable Shape mode until `SHAPE-01` lands. `Pending`
- `MEM-01` PNG-encode pixel-action buffers; deferred — shipped the simpler stroke-bbox-tight history instead (paint tools now commit a rect proportional to stroke size, with `cropImageData` shrinking the captured before-buffer to match). `Resolved via GAP-15`
- `MEM-02` Storage Usage dialog (`Edit > Preferences > Storage`): OPFS quota, autosave size, history memory estimate. `Implemented`
- `REFINE-01` Smart radius + decontaminate in Refine Edge, plus honest output-destination UI. `Honest output destinations Implemented (BUG-05); smart radius + decontaminate still pending`
- `STYLE-01` Inner Shadow + Outer Glow renderers after the selection/type/shape expectation gaps are addressed. `Pending`
- `RETOUCH-01` Healing-family retouch tools (Spot Healing, Healing Brush, Patch, Red Eye, Background Eraser, Magic Eraser). `Pending — see Milestone 4`
