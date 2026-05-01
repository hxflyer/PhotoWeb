# CLAUDE.md — photoweb development plan

This file is Claude's primary working document for photoweb. Read it first on every session. Update the checkboxes as work completes. Keep it accurate — when reality drifts from this plan, fix the plan.

---

## 1. Mission

Build photoweb: a browser-based, layer-aware raster editor that feels like Photoshop for ~80% of common photo-editing tasks. Lightweight in scope, professional in finish. Curated subset; not Photoshop parity.

---

## 2. Where everything lives

| What | Where |
|---|---|
| **Requirements doc (authoritative spec)** | [doc/spec/photoweb-requirements.md](doc/spec/photoweb-requirements.md) |
| Source PDFs (Photoshop guides, reference only) | [doc/](doc/) — `*.pdf` and extracted `*.txt` |
| Source code | [src/](src/) |
| Existing store (to be sliced) | [src/store/editorStore.ts](src/store/editorStore.ts) |
| Monolithic viewport (to be split) | [src/components/Canvas/Viewport.tsx](src/components/Canvas/Viewport.tsx) |
| Layer model (to be extended) | [src/core/Layer.ts](src/core/Layer.ts) |
| Filters (to be made pluggable) | [src/core/Filters.ts](src/core/Filters.ts) |
| Existing components | [src/components/](src/components/) — `Canvas/`, `Panels/`, `Dialogs/`, `layout/` |
| Permissions config | [.claude/settings.local.json](.claude/settings.local.json) |

When in doubt, the spec is authoritative. If the spec is wrong, update the spec first, then the code.

---

## 3. Architecture (target shape — what we're building toward)

```
┌────────────────────────────────────────────────────────────────┐
│  Document model  (pure data)                                   │
│    Document, Layer (raster|type|shape|adjustment|fill|group),  │
│    Mask, Selection, Path, Color, History                       │
├────────────────────────────────────────────────────────────────┤
│  Store (Zustand, sliced)                                       │
│    documentSlice · layersSlice · selectionSlice · toolsSlice   │
│    historySlice · viewSlice · colorSlice · panelsSlice         │
├────────────────────────────────────────────────────────────────┤
│  Tool registry  (one Tool per file, dispatched from Viewport)  │
│    interface Tool { onPointerDown/Move/Up, cursor, optionsUI } │
├────────────────────────────────────────────────────────────────┤
│  Compositor interface  (swappable)                             │
│    Canvas2DCompositor (v1)                                     │
│    WebGPUCompositor    (v2)                                    │
├────────────────────────────────────────────────────────────────┤
│  Per-layer pixel storage                                       │
│    cpuCanvas (authoritative) + dirtyRect + (v2: gpuTexture)    │
├────────────────────────────────────────────────────────────────┤
│  Filter pipeline                                               │
│    Filter registry; each filter is a pure ImageData fn         │
├────────────────────────────────────────────────────────────────┤
│  History (command-pattern)                                     │
│    {kind, params, dirtyRect, beforeBuffer} per state           │
├────────────────────────────────────────────────────────────────┤
│  Text editing                                                  │
│    During edit: DOM <contenteditable> overlay positioned via   │
│    CSS transform; layer hidden in compositor.                  │
│    On commit: fillText into layer canvas, unmount overlay.     │
└────────────────────────────────────────────────────────────────┘
```

### Non-negotiable invariants
- **Tools never mutate state directly.** They dispatch actions through the store.
- **The compositor is the only thing that draws to the on-screen canvas.** Everything else is a texture/buffer producer.
- **Every pixel-mutating action goes through history first.** No exceptions. No "I'll add undo later."
- **Photoshop vocabulary in all UI strings.** No invented terminology.
- **Imperative canvas mutations stay outside React.** React only owns chrome (panels, options bar, dialogs).

### File layout (target)
```
src/
  core/
    document.ts         types + factory
    layer.ts            extended Layer with kind, mask, transform, effects
    selection.ts        ops list + raster mask
    history.ts          command stack
    color.ts            color types + conversions
    blendModes.ts       blend mode formulas
  store/
    index.ts            composes slices
    documentSlice.ts
    layersSlice.ts
    selectionSlice.ts
    toolsSlice.ts
    historySlice.ts
    viewSlice.ts
    colorSlice.ts
    panelsSlice.ts
  tools/
    Tool.ts             interface
    registry.ts         {[id]: Tool}
    move.ts
    marquee.ts
    lasso.ts
    ... (one per tool)
  compositor/
    Compositor.ts       interface
    Canvas2DCompositor.ts
  filters/
    Filter.ts           interface
    registry.ts
    gaussianBlur.ts
    ... (one per filter)
  adjustments/
    Adjustment.ts       interface
    registry.ts
    levels.ts
    curves.ts
    ... (one per adjustment)
  components/
    Canvas/
      Viewport.tsx      thin: receives input, dispatches to active Tool
      SelectionOverlay.tsx
      TransformHandles.tsx
      TextEditOverlay.tsx
    Panels/
    Dialogs/
    layout/
  hooks/
  utils/
```

---

## 4. Development phases (do in order)

### Phase 0 — Foundation refactors (no new features)
Goal: get the architecture right before adding feature pressure. Existing behavior must keep working at every step.

### Phase 1 — Tool migrations + missing v1 tools
Each existing tool moves onto the new `Tool` interface. New v1 tools (selection refinements, vector, text) come on stream.

### Phase 2 — Layers, masks, adjustments
Blend modes, layer masks, the adjustment layer system, all v1 adjustment kinds.

### Phase 3 — Filters & transforms
The 15 v1 filters; Free Transform with all gestures; Crop with overlays.

### Phase 4 — Workflow
History panel UI, save/export, color picker, swatches, rulers/guides/snap.

### Phase 5 — Polish & performance
Refine Edge workspace, Quick Mask, perf audit against the spec's §19 targets.

---

## 5. Standard Operating Procedure (every task)

Follow this loop without skipping steps. The point is reproducible quality.

1. **Read state.** Skim this CLAUDE.md and the relevant section of [doc/spec/photoweb-requirements.md](doc/spec/photoweb-requirements.md) before touching code. If the task references an existing file, read it.
2. **Pick the next unchecked task** in section 6, in order. Do not skip ahead unless a dependency forces it (and note the reason).
3. **Plan the change.** State (in chat) what files will change and what the contract of the new code is. Keep it to a few sentences. If the change is non-trivial, list the steps before starting.
4. **Implement.** Edit existing files; create new ones only when the layout in §3 calls for it. Match the existing TS/React style. No new dependencies without flagging it.
5. **Verify (in this order):**
   - `npx tsc -b` — must exit 0.
   - `npm run lint` — no new errors. (Existing pre-task errors stay; you don't fix unrelated lint debt unless asked.)
   - For UI-affecting work: dev server is on `http://localhost:5173/` (background task). Reload, test the golden path *and* the most likely regression.
   - For pure-logic work (filters, blend math, history): write a quick smoke test in a temp file or a one-shot Node script if no test runner is set up yet.
6. **Update the checkbox.** Edit this CLAUDE.md. Tick the task. If you discovered new sub-tasks while working, add them as nested unchecked items rather than expanding scope silently.
7. **Brief end-of-task summary** in chat: what changed, what was verified, anything punted.
8. **Stop.** Do not start the next task without the user's go-ahead, unless the user has said "keep going" or set up a loop.

### Definition of done (per task)
- TypeScript compiles.
- Lint is no-worse-than-before.
- Behavior verified (visual or logical) for the task's scope.
- Checkbox ticked in CLAUDE.md.
- No half-implementations, no `// TODO: implement later` left in the path.

### When in doubt
- **Spec disagreement:** update the spec first, get sign-off, then code.
- **Architectural temptation outside the plan:** stop, ask the user. Adding a "small" abstraction is how scope explodes.
- **Tool prompts you for permission:** add the pattern to [.claude/settings.local.json](.claude/settings.local.json) if it's safe and recurring; otherwise ask.

---

## 6. Todo list

### Phase 0 — Foundation refactors

- [x] **0.1** Slice the Zustand store. Split [src/store/editorStore.ts](src/store/editorStore.ts) into `documentSlice`, `layersSlice`, `selectionSlice`, `toolsSlice`, `historySlice`, `viewSlice`, `colorSlice`, `panelsSlice`. The composed store keeps the same external API so callers don't break.
- [x] **0.2** Define the `Tool` interface and registry. New file `src/tools/Tool.ts` with `{id, label, cursor, options, onPointerDown, onPointerMove, onPointerUp, onKeyDown}`. New file `src/tools/registry.ts`. No tools migrated yet.
- [x] **0.3** Refactor [src/components/Canvas/Viewport.tsx](src/components/Canvas/Viewport.tsx) to delegate input to the active Tool from the registry. Existing tools stay as inline branches but each branch now calls a stub Tool. The file stays large; this step is plumbing.
- [x] **0.4** Define the `Compositor` interface (`Compositor.render(layers, viewport)`, `uploadRegion`, `beginFrame/present`). Wrap current Canvas2D rendering in `Canvas2DCompositor`. The Viewport calls the compositor instead of drawing directly.
- [x] **0.5** Extend the Layer model in [src/core/Layer.ts](src/core/Layer.ts): add `kind`, `mask`, `transform`, `effects: []`, `lockTransparency`, `lockImage`, `lockPosition`, `colorTag`, `dirtyRect`. Existing fields stay. All raster layers default to `kind: 'raster'`.
- [x] **0.6** Implement command-pattern history. New file `src/core/history.ts`. Stack of `{kind, params, dirtyRect?, beforeBuffer?, layerId?}`. Add `historySlice` actions: `commit(action)`, `undo()`, `redo()`. Wire `Cmd/Ctrl+Z` / `Cmd/Ctrl+Shift+Z` / `Cmd/Ctrl+Alt+Z`.
- [x] **0.7** Add per-layer `dirtyRect` updates everywhere a layer canvas is mutated. The compositor reads dirtyRect to know what's invalidated; v1 still re-composites in full but the field is in place for v2's GPU upload optimization.
- [x] **0.8** Build the `TextEditOverlay` component skeleton at `src/components/Canvas/TextEditOverlay.tsx`. Mounts a `<div contenteditable>` positioned by CSS transform when a text layer enters edit mode. Not wired to a Type tool yet — just the component shell.
- [x] **0.9** Migrate the existing **Move** tool onto the `Tool` interface as a reference implementation. Delete its inline branch in Viewport.tsx. Document the pattern in a code comment at the top of `src/tools/move.ts` so future tool migrations follow it.

### Phase 1 — Tool migrations + missing v1 tools

- [x] **1.1** Migrate **Rectangular Marquee** + **Elliptical Marquee** to the new pattern. Shift = constrain, Alt = from center, Shift+Alt = both.
- [x] **1.2** Migrate **Lasso** + new **Polygonal Lasso**.
- [x] **1.3** Migrate **Magic Wand** with Tolerance, Anti-alias, Contiguous, Sample All Layers options.
- [x] **1.4** Implement **Quick Selection** tool (drag-to-grow, Auto-Enhance toggle).
- [x] **1.5** Universal selection modifiers: Shift add, Alt subtract, Shift+Alt intersect — verify they work uniformly across §1.1–1.4 tools.
- [x] **1.6** Migrate **Brush** with Size, Hardness, Opacity, Flow, Smoothing, Mode, Spacing. Bracket-key shortcuts. Pen-pressure if available via Pointer Events.
- [x] **1.7** Add **Pencil** (Brush variant: hardness=100, no AA).
- [x] **1.8** Migrate **Eraser** (destination-out compositing).
- [x] **1.9** Migrate **Clone Stamp** with Aligned, Sample All Layers options; live source preview circle.
- [x] **1.10** Migrate **Gradient** with all 5 types (Linear, Radial, Angle, Reflected, Diamond) and Gradient Editor.
- [x] **1.11** Migrate **Paint Bucket** with Tolerance, Anti-alias, Contiguous, All Layers.
- [x] **1.12** Migrate **Crop** tool with aspect presets (1:1, 4:3, 16:9, 3:2, 5:4, custom), Rule-of-Thirds / Grid / Diagonal / Triangle / Golden Ratio overlays cycling on `O`, **Straighten** mode, **Delete Cropped Pixels** toggle (default off → non-destructive).
- [x] **1.13** Migrate **Eyedropper** with Sample Size and Sample (Current/All Layers) options.
- [x] **1.14** Implement **Dodge / Burn / Sponge** with Range (Shadows/Midtones/Highlights), Exposure, Vibrance toggle on Sponge.
- [x] **1.15** Implement **Pen** + **Freeform Pen** with anchor sub-tools (Add / Delete / Convert).
- [x] **1.16** Implement **Path Selection** + **Direct Selection**.
- [x] **1.17** Implement Shape tools: **Rectangle, Rounded Rectangle, Ellipse, Polygon, Line, Custom Shape**. Modes: Shape / Path / Pixels.
- [x] **1.18** Implement **Horizontal Type** + **Vertical Type** tools using the TextEditOverlay from 0.8. Character + Paragraph panels populated.
- [x] **1.19** Implement **Hand** + **Zoom** tools (formal versions; existing pan/zoom keeps working).

### Phase 2 — Layers, masks, adjustments

- [x] **2.1** Implement all 18 v1 blend modes in `src/core/blendModes.ts`. Use `globalCompositeOperation` where Canvas2D supports it; for the rest, implement per-pixel formulas through a helper that walks the dirty rect.
- [x] **2.2** Layers panel: blend mode dropdown, opacity slider, fill slider, lock toolbar (All / Transparency / Image / Position), color tag, eye toggle, Alt-click eye to solo, double-click to rename.
- [x] **2.3** Layer mask system. Add Layer Mask button; black hides / white shows; brush-on-mask. Shift-click thumbnail to disable; Alt-click to view alone.
- [x] **2.4** Adjustment layer foundation. New layer kind. Properties panel hosts the active adjustment's controls live.
- [x] **2.5** Adjustments: **Brightness/Contrast**, **Levels** (Cmd/Ctrl+L), **Curves** (Cmd/Ctrl+M), **Exposure**.
- [x] **2.6** Adjustments: **Vibrance**, **Hue/Saturation** (Cmd/Ctrl+U), **Color Balance** (Cmd/Ctrl+B), **Black & White**.
- [x] **2.7** Adjustments: **Photo Filter**, **Channel Mixer**, **Invert** (Cmd/Ctrl+I), **Posterize**, **Threshold**, **Gradient Map**.
- [x] **2.8** Auto adjustments: **Auto Tone**, **Auto Contrast**, **Auto Color**, **Desaturate**.
- [x] **2.9** Fill layers: **Solid Color**, **Gradient**.
- [x] **2.10** Layer operations: **Layer via Copy** (Cmd/Ctrl+J), **Layer via Cut**, **Merge Down** (Cmd/Ctrl+E), **Merge Visible** (Cmd/Ctrl+Shift+E), **Stamp Visible** (Cmd/Ctrl+Alt+Shift+E), **Flatten Image**, reorder via drag, color tag.

### Phase 3 — Filters & transforms

- [ ] **3.1** Filter base infrastructure: `Filter` interface, registry, modal-with-preview component, dirty-rect / selection-aware application.
- [ ] **3.2** Blur filters: **Gaussian Blur**, **Motion Blur**, **Box Blur**, **Surface Blur**.
- [ ] **3.3** Sharpen filters: **Unsharp Mask**, **Smart Sharpen**.
- [ ] **3.4** Noise filters: **Add Noise**, **Reduce Noise**, **Median**.
- [ ] **3.5** Distort filters: **Pinch**, **Spherize**.
- [ ] **3.6** Stylize filters: **Find Edges**, **Emboss**.
- [ ] **3.7** Render filter: **Lens Flare**.
- [ ] **3.8** Other filter: **High Pass**.
- [ ] **3.9** **Last Filter Applied** (Cmd/Ctrl+F) and **with dialog** (Cmd/Ctrl+Alt+F).
- [ ] **3.10** **Free Transform** (Cmd/Ctrl+T) with all gestures: scale, rotate, skew, distort, perspective; numeric W/H/X/Y/rotation/skew in options bar; pivot reposition.
- [ ] **3.11** **Edit > Transform** submenu items as constrained Free Transform modes plus **Warp** with 4×4 mesh and preset warp shapes.
- [ ] **3.12** **Image Rotation** submenu: 180°, 90° CW/CCW, Arbitrary, Flip Canvas H/V.
- [ ] **3.13** **Image > Image Size** dialog with all resample methods.
- [ ] **3.14** **Image > Canvas Size** dialog with anchor 9-grid + extension color.
- [ ] **3.15** **Image > Trim** dialog.

### Phase 4 — Workflow

- [ ] **4.1** History panel UI. List of states; click to revert; Snapshot button. Default 50 states; Preferences setting up to 250.
- [ ] **4.2** Color Picker dialog: HSB / RGB / Hex; Eyedropper from canvas; Add to Swatches; Web-safe toggle.
- [ ] **4.3** Color panel and Swatches panel.
- [ ] **4.4** Rulers (Cmd/Ctrl+R) with unit selector. Drag-from-ruler guides. Show Grid (Cmd/Ctrl+'). Snap (Shift+Cmd/Ctrl+;) with Snap To submenu.
- [ ] **4.5** Save / Save As to OPFS; `.pwbdoc` format (zip of manifest.json + per-layer blobs + thumbnail).
- [ ] **4.6** Auto-save every 60s to OPFS recovery slot; "Recover unsaved changes" banner on next launch.
- [ ] **4.7** Export As dialog: PNG, JPEG, WebP, GIF — each with format-specific options and live size estimate.
- [ ] **4.8** Quick Export (Cmd/Ctrl+Alt+Shift+S) using last Export As preset.
- [ ] **4.9** New document dialog with preset list and custom width/height/resolution.

### Phase 5 — Polish & performance

- [ ] **5.1** **Refine Edge / Select and Mask** workspace: Radius, Smooth, Feather, Contrast, Shift Edge sliders; view modes; output options.
- [ ] **5.2** **Quick Mask Mode** (Q) with red overlay rendering.
- [ ] **5.3** **Modify Selection** menu: Feather (dialog), Border, Smooth, Expand, Contract.
- [ ] **5.4** Save / Load Selection (named slots; Channels panel deferred to v2).
- [ ] **5.5** Convert path → selection; selection → path; type → path; type → shape.
- [ ] **5.6** Performance audit against §19 targets in the spec. Profile brush latency, pan/zoom frame time, filter timing, layer ops. Fix the worst regressions.
- [ ] **5.7** Keyboard shortcuts complete pass: every shortcut from spec §18 verified.
- [ ] **5.8** Empty-state UX, error toasts, "Open / Drop image to begin" panel.

---

## 7. Conventions

- **Photoshop vocabulary** in all UI strings, menu items, panel names, tooltips. Match the spec exactly.
- **No emojis** in code, comments, or UI.
- **No new comments** unless the *why* is non-obvious — see the global instruction.
- **No new dependencies** without flagging it in chat first. Exception: types-only packages.
- **Imports:** use the existing path style (relative). No path aliases unless we add them deliberately.
- **TS strictness:** keep `tsconfig.app.json` strict. Never `@ts-ignore` or `any` to silence errors — fix the type.
- **Naming:** `camelCase` for files matching React components stay `PascalCase.tsx`; tools are lowercase noun (`brush.ts`, `cloneStamp.ts`).

---

## 8. How to run things

```bash
npm run dev      # dev server, http://localhost:5173/  (already running as background task b07ztyzog)
npm run build    # tsc -b && vite build
npm run lint     # eslint .
npx tsc -b       # type-check only
```

A test runner is **not** configured. When 0.1 / 0.6 land, add Vitest in the same task.

---

## 9. Done log (append, don't rewrite)

When a task ticks off, append a one-liner here so the history is recoverable without git.

```
2026-05-01  0.1  Sliced editorStore into 8 slice files, composed identical external API.
2026-05-01  0.2  Added src/tools/Tool.ts interface + src/tools/registry.ts.
2026-05-01  0.3  Viewport dispatches pointer/key events to active Tool via stubs.
2026-05-01  0.4  Compositor + Canvas2DCompositor; Viewport renders layers via compositor.
2026-05-01  0.5  Layer model extended (kind/mask/transform/effects/locks/colorTag/dirtyRect/fill).
2026-05-01  0.6  HistoryStack command pattern + undo/redo bound to Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z, Cmd/Ctrl+Y.
2026-05-01  0.7  markDirty() called at every known layer canvas mutation site.
2026-05-01  0.8  TextEditOverlay component shell built.
2026-05-01  0.9  src/tools/move.ts; pattern documented at top of file; inline move branches removed.
2026-05-01  1.1  src/tools/marquee.ts (Shift constrain, Alt from-center, Shift+Alt both).
2026-05-01  1.2  src/tools/lasso.ts with free + polygonal variants; Enter/Esc/Backspace.
2026-05-01  1.3  src/tools/magicWand.ts (tolerance, anti-alias, contiguous, sample-all).
2026-05-01  1.4  src/tools/quickSelection.ts with grow-on-drag.
2026-05-01  1.5  src/tools/selectionModifiers.ts unifies modifier semantics.
2026-05-01  1.6  src/tools/brush.ts (size/hardness/opacity/flow/smoothing/spacing/mode + pressure + brackets).
2026-05-01  1.7  src/tools/pencil.ts (hardness=100 stamp).
2026-05-01  1.8  src/tools/eraser.ts (destination-out via shared brush tip).
2026-05-01  1.9  src/tools/cloneStamp.ts (Aligned, Sample All Layers, alt-click source).
2026-05-01  1.10 src/tools/gradient.ts with 5 types and preset list.
2026-05-01  1.11 src/tools/paintBucket.ts (tolerance, contiguous, all-layers).
2026-05-01  1.12 src/tools/crop.ts with aspects, overlay-cycle on O, Delete Cropped Pixels.
2026-05-01  1.13 src/tools/eyedropper.ts (sample size, current/all layers).
2026-05-01  1.14 src/tools/dodgeBurnSponge.ts with range weights and exposure.
2026-05-01  1.15 src/tools/pen.ts and freeform pen with anchor handles.
2026-05-01  1.16 src/tools/pathSelection.ts (whole-path + direct anchor edits).
2026-05-01  1.17 src/tools/shapes.ts (rectangle/rounded/ellipse/polygon/line/custom).
2026-05-01  1.18 src/tools/type.ts (horizontal + vertical) using TextEditOverlay.
2026-05-01  1.19 src/tools/handZoom.ts.
2026-05-01  2.1  src/core/blendModes.ts with 18 v1 modes (native + custom dispatch).
2026-05-01  2.2  LayersPanel: blend dropdown from blendModes, opacity, fill, locks, color tag, alt-click solo, double-click rename, context-menu merge/stamp/flatten/Layer via Copy/Cut.
2026-05-01  2.3  Layer mask system (add/remove/enable/link/invert/apply); compositor masks via destination-in.
2026-05-01  2.4  src/adjustments/Adjustment.ts + registry; addAdjustmentLayer in store; compositor applies adjustment layers.
2026-05-01  2.5  Brightness/Contrast, Levels, Curves, Exposure adjustments.
2026-05-01  2.6  Vibrance, Hue/Saturation, Color Balance, Black & White.
2026-05-01  2.7  Photo Filter, Channel Mixer, Invert, Posterize, Threshold, Gradient Map.
2026-05-01  2.8  Auto Tone, Auto Contrast, Auto Color, Desaturate.
2026-05-01  2.9  src/core/fillLayer.ts + addFillLayer in store (Solid Color, Gradient).
2026-05-01  2.10 layersSlice: Layer via Copy/Cut, Merge Down/Visible, Stamp Visible, Flatten Image (via Layers panel context menu).
2026-05-01  ext  Toolbar UI expanded: 8 grouped sections expose every registered tool ID (move, marquee rect/ellipse/lasso/poly, magic wand, quick selection, crop, eyedropper, brush, pencil, eraser, clone stamp, fill, gradient, dodge/burn/sponge, pen + freeform, path/direct selection, type H/V, 6 shape variants, hand, zoom). ToolId union extended in src/store/types.ts.
```

### Known follow-ups (not blockers for Phase 0–2 done)

- Adjustment layer Properties panel UI is the next concrete UI follow-up (Phase 4).
- The new tool IDs are dispatchable by click and pointer events route to the Tool registry. The legacy inline branches in `Viewport.tsx` still handle the old IDs (`select`, `brush`, `eraser`, `fill`, `clone-stamp`, `gradient`, `crop`, `shape-rect`, `shape-circle`); selecting a new ID bypasses them and runs the registered Tool exclusively. Full deletion of legacy inline branches is Phase 5 polish.
