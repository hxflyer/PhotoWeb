# CLAUDE.md — photoweb operating guide

Read first on every session. Keep this file focused on durable workflow, scope, architecture, and conventions. Active feature work belongs in whatever plan doc the user introduces — when one exists, treat it as the source of truth for what to build next.

---

## 1. Mission

Build photoweb: a browser-based, layer-aware raster editor that feels like Photoshop for ~80% of common photo-editing tasks. Lightweight in scope, professional in finish. Curated subset; not Photoshop parity.

---

## 2. Where everything lives

| What | Where |
|---|---|
| **Active plan** | None right now. The previous plan/backlog/parallel-plan trio is done and was removed; archived companions (user cases, UX gap report) live under [doc/photoshop-desktop-study/archive/](doc/photoshop-desktop-study/archive/). The user will introduce the next plan when ready. |
| **Implementation changelog** (historical record) | [doc/photoshop-desktop-study/CHANGELOG.md](doc/photoshop-desktop-study/CHANGELOG.md) |
| **Lessons scope map** (every Photoshop Essentials lesson tagged `in_scope` + `out_reason`) | [doc/photoshop-essentials-basics/lessons.json](doc/photoshop-essentials-basics/lessons.json) — rules in [scripts/classify-lesson-scope.py](scripts/classify-lesson-scope.py) |
| Photoshop source notes | [doc/photoshop-desktop-study/pages/](doc/photoshop-desktop-study/pages/) |
| Photoshop source images | [doc/photoshop-desktop-study/images/](doc/photoshop-desktop-study/images/) |
| Source PDFs (reference only) | [doc/](doc/) — `*.pdf` and extracted `*.txt` |
| Store entry point | [src/store/editorStore.ts](src/store/editorStore.ts) |
| Store shared types | [src/store/types.ts](src/store/types.ts) |
| Canvas viewport | [src/components/Canvas/Viewport.tsx](src/components/Canvas/Viewport.tsx) |
| Layer model | [src/core/Layer.ts](src/core/Layer.ts) |
| Tool interface + registry | [src/tools/Tool.ts](src/tools/Tool.ts), [src/tools/registry.ts](src/tools/registry.ts) |
| Compositor | [src/compositor/](src/compositor/) |
| Filters / Adjustments / Effects | [src/filters/](src/filters/), [src/adjustments/](src/adjustments/), [src/effects/](src/effects/) |
| Permissions config | [.claude/settings.local.json](.claude/settings.local.json) |

Without an active plan, do not start feature work on your own — wait for the user to scope the next batch. Scope guardrails in §4 still apply at all times.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Document model  (pure data)                                    │
│    Document, Layer (raster|type|shape|adjustment|fill|group),   │
│    Mask, Selection, Path, Color, History                        │
├─────────────────────────────────────────────────────────────────┤
│  Store (Zustand, sliced — composed in editorStore.ts)           │
│    documentSlice · layersSlice · selectionSlice · toolsSlice    │
│    historySlice · viewSlice · colorSlice · panelsSlice          │
│    presetsSlice · toastsSlice · requirementsSlice               │
├─────────────────────────────────────────────────────────────────┤
│  Tool registry  (one Tool per file, dispatched from Viewport)   │
│    interface Tool { onPointerDown/Move/Up, cursor, optionsUI }  │
├─────────────────────────────────────────────────────────────────┤
│  Compositor interface  (swappable)                              │
│    Canvas2DCompositor (v1) — WebGPU planned for later           │
├─────────────────────────────────────────────────────────────────┤
│  Per-layer pixel storage                                        │
│    cpuCanvas (authoritative) + dirtyRect                        │
├─────────────────────────────────────────────────────────────────┤
│  Filters / Adjustments / Effects (each a registry of pure fns)  │
├─────────────────────────────────────────────────────────────────┤
│  History (command-pattern timeline + active cursor)             │
├─────────────────────────────────────────────────────────────────┤
│  Text editing                                                   │
│    During edit: DOM <contenteditable> overlay positioned via    │
│    CSS transform; layer hidden in compositor.                   │
│    On commit: fillText into layer canvas, unmount overlay.      │
└─────────────────────────────────────────────────────────────────┘
```

### Non-negotiable invariants
- **Tools never mutate state directly.** They dispatch actions through the store.
- **The compositor is the only thing that draws to the on-screen canvas.** Everything else is a texture/buffer producer.
- **Every pixel-mutating action goes through history first.** No exceptions. No "I'll add undo later."
- **Photoshop vocabulary in all UI strings.** No invented terminology.
- **Imperative canvas mutations stay outside React.** React only owns chrome (panels, options bar, dialogs).

### File layout (actual)
```
src/
  core/        Layer.ts, Filters.ts, blendModes.ts, history.ts,
               fillLayer.ts, imageTransforms.ts, persistence.ts,
               autoSave.ts, shortcuts.ts
  store/       editorStore.ts (compose), types.ts, *Slice.ts
  tools/       Tool.ts, registry.ts, one file per tool
               (marquee, lasso, move, brush, pen, type, gradient, ...)
  compositor/  Compositor.ts, Canvas2DCompositor.ts
  filters/     Filter.ts, registry.ts, applyFilter.ts, *Filters.tsx
  adjustments/ Adjustment.ts, registry.ts, applyAdjustment.ts, *.ts
  effects/     Effect.ts, registry.ts, dropShadow, bevelEmboss,
               stroke, *Glow, *Overlay, satin, ...
  components/
    Canvas/    Viewport.tsx + overlays (TransformHandles, TextEdit,
               SelectAndMaskCanvas, WarpOverlay, ...)
    Panels/    Layers, History, Properties, Channels, Paths,
               Character, Paragraph, Color, Swatches, Info,
               Navigator, OptionsBar, Toolbar, presets panels, ...
    Dialogs/   30+ modal dialogs (NewDocument, Filter, Adjustment,
               LayerStyle, Preferences, Export, StorageUsage, ...)
    Overlay/   transient on-canvas overlays
    layout/    MainLayout, MenuBar, StatusBar, ToastContainer
    icons/     icon components
  hooks/       reusable React hooks
  utils/       brushEngine, canvasUtils, geometry, mask ops,
               selectAndMaskCompositor, textWarp, units, ...
  bridge/      requirementsClient (host bridge)
  assets/      static UI assets (icons, etc.)
  test/        130+ vitest specs (see §7)
```

---

## 4. Scope Guardrails

Photoweb is a focused browser photo editor, not a full Photoshop clone. Use the active plan (when one exists) to decide *what* to build next; use this section to decide whether something is in scope at all.

**Do build** features that improve browser-based photo editing: history, layers, masks, selections, retouching, layer styles, shape/text basics, guides/snap, presets, stability, storage/performance diagnostics.

**Do NOT implement** these unless the user explicitly changes scope:
- AI/generative features or complex content synthesis.
- Cloud accounts, collaboration, sharing, Adobe integrations, remote asset services.
- Print production, CMYK, spot colors, separations, prepress workflows.
- Video, timeline, animation, animated export.
- Help, release notes, FAQ, documentation browser, or product-support features inside the app.
- Smart Objects, Smart Filters, PSD parity, Actions, droplets, batch automation, scripting engines.
- Professional export expansion (layer export, scaled export sets, metadata editing, advanced file-format parity) unless the active plan explicitly brings it in scope.

### Explicit exclusions (from the lessons-index scope review)

Each bullet maps to the `out_reason` tags used in [doc/photoshop-essentials-basics/lessons.json](doc/photoshop-essentials-basics/lessons.json). Re-run [scripts/classify-lesson-scope.py](scripts/classify-lesson-scope.py) after editing the rules.

- **Adobe ecosystem** — Adobe Bridge (`adobe_bridge`), Lightroom round-trip (`lightroom_integration`), Camera Raw (`camera_raw`), Creative Cloud sync / Cloud Documents (`creative_cloud`), photo-import-from-camera (`camera_import`).
- **App management** — install / update / beta download (`install_update`, `changelog`), OS default-image-editor and file-type registration (`os_integration`), preferences reset (`prefs_reset`), generative credits (`generative_ai`).
- **AI / generative** — Select Subject, Remove Background, AI Object Finder mode (`ai_cloud_selection`); Content-Aware Fill/Crop (`content_aware`); Generative Fill / Firefly (`generative_ai`). The non-AI Object Selection Tool itself is kept.
- **Non-destructive containers / automation** — Smart Objects (`smart_objects`), Smart Filters (`smart_filters`), Actions / droplets / batch automation (`actions_automation`).
- **Output / metadata** — print-specific resize and frame-size matching (`print_output`), file metadata / contact-copyright info (`file_metadata`), watermarking workflows (`watermark_workflow`).
- **UI history / customization** — pure version-changelog lessons (`version_changelog`), legacy / restored UI toggles (`legacy_ui`), home/start screen and recent files (`home_screen`), rich tooltip overlays (`rich_tooltips`), Workspaces (`workspaces`), Custom Keyboard Shortcuts (`custom_shortcuts`), custom/reset Toolbar (`toolbar_customization`).
- **Dropped tools** — Frame Tool (`frame_tool`); navigation extras: Birds Eye View, Rotate View Tool, Overscroll, Navigator panel (`nav_extras`).
- **Color management** — Color Settings dialog and working color spaces (`color_management`). Assume sRGB end-to-end.
- **Multi-document UI** — tabbed/floating document windows, arrange-documents, view-multiple-images, sync-zoom-across-docs (`multi_doc_ui`). One Document at a time.

### Explicit inclusions (beyond the bullet list above)

These were confirmed in scope during the review and override any apparent overlap with broader exclusions:
- Image size & resampling, including pixel-art nearest-neighbor and resize-for-email/web (but not resize-for-print).
- Object Selection Tool in non-AI mode (marquee-around-object + edge refinement).
- Layer Style presets (save/load).
- Brush dynamics — Shape, Scattering, Texture, Dual Brush, Color, Other Dynamics — plus brush preset save/load.
- Paint Symmetry.
- Curvature Pen Tool, Type on Path, Warp Text.

---

## 5. Standard Operating Procedure (every task)

1. **Read state.** Skim this file and the active plan from the user. Read the related Photoshop source note(s) in [doc/photoshop-desktop-study/pages/](doc/photoshop-desktop-study/pages/) and inspect matching images in [doc/photoshop-desktop-study/images/](doc/photoshop-desktop-study/images/) so behavior, buttons, cursors, panels, and terminology are grounded in the reference material. If the task references an existing file, read it.
2. **Pick the next task** from the active plan, in the order the plan dictates. If there is no active plan, stop and ask the user to provide one — do not invent feature work.
3. **Plan the change** in chat: what files, what contract. Few sentences. List steps for non-trivial changes.
4. **Implement.** Edit existing files; create new ones only when §3 calls for it. Match existing TS/React style. No new dependencies without flagging.
5. **Verify (in this order):**
   - `npx tsc -b` — must exit 0.
   - `npm run lint` — no new errors (existing pre-task errors stay).
   - **`npm test` — green AND includes a NEW simulator-driven test for this feature.** Tests live in `src/test/<area>.test.ts(x)`, script user input via [src/test/simulator.ts](src/test/simulator.ts), and assert on store state, layer pixels (real Canvas2D via node-canvas), or selection paths. Test names read like user actions ("clicking + adds a layer", "marquee drag with Shift constrains to a square"). UI tests render via `@testing-library/react` and dispatch with `runScript`. Tool-level tests call `getTool(id).onPointerXxx` with `makeToolPointerEvent(...)`. Pixel results: `layerPixelAt` / `pixelAt`.
   - For UI-affecting work: run `npm run dev` if no dev server is active, open `http://localhost:5173/`, and test the golden path plus the most likely regression.
6. **Update plan status** (if the active plan tracks status). Discovered sub-tasks become new plan items, never silent scope creep.
7. **Brief end-of-task summary** in chat: what changed, what was verified, anything punted.
8. **Stop.** Do not start the next task without user go-ahead, unless they said "keep going" or set up a loop.

### Definition of done (per task)
- TypeScript compiles.
- Lint is no-worse-than-before.
- `npm test` green AND includes ≥1 new simulator-driven test for this feature.
- Behavior verified (visual or logical) for the task's scope.
- Plan status updated if the active plan tracks status.
- No half-implementations, no `// TODO: implement later` left in the path.

### When in doubt
- **Scope/plan disagreement:** raise it with the user before coding. If the active plan needs amending, amend it first, then code.
- **Architectural temptation outside the plan:** stop, ask. A "small" abstraction is how scope explodes.
- **Tool prompts for permission:** add the pattern to [.claude/settings.local.json](.claude/settings.local.json) if safe and recurring; otherwise ask.

---

## 6. Conventions

- **Photoshop vocabulary** in all UI strings, menu items, panel names, and tooltips. Ground terminology in the Photoshop source notes under [doc/photoshop-desktop-study/pages/](doc/photoshop-desktop-study/pages/).
- **No emojis** in code, comments, or UI.
- **No new comments** unless the *why* is non-obvious.
- **No new dependencies** without flagging in chat. Exception: types-only packages.
- **Imports:** existing relative-path style. No path aliases unless deliberately added.
- **TS strictness:** keep `tsconfig.app.json` strict. Never `@ts-ignore` or `any` to silence errors — fix the type.
- **Naming:** React components stay `PascalCase.tsx`; tools are lowercase noun (`brush.ts`, `cloneStamp.ts`); core single-class modules can be `PascalCase.ts` (e.g. `Layer.ts`).
- **Generated UI icons/images:** if a simple icon or pixel-art UI asset is needed, generate it with [scripts/icon_grid.py](scripts/icon_grid.py) and import the saved asset. Do not draw ad hoc icons at runtime with CSS boxes, canvas strokes, or inline placeholders. Prefer SVG; use PNG only when raster output is specifically useful. Store assets under `src/assets/icons/` unless a feature already has a more specific folder.

### Icon helper

```python
from scripts.icon_grid import save_icon

save_icon(
    ["..#..", ".###.", "#####", "..#..", "..#.."],
    "src/assets/icons/arrow-up.svg",
    palette={".": None, "#": "#d7d7d7"},
    cell=4,
)
```

```bash
python3 scripts/icon_grid.py '["..#..",".###.","#####","..#..","..#.."]' \
  src/assets/icons/arrow-up.svg \
  --palette '{".":null,"#":"#d7d7d7"}' \
  --cell 4
```

Grid rules: rows must be equal length; `.` or `None` is transparent; palette accepts `#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA`; scale with `cell` instead of hand-drawing larger shapes.

---

## 7. How to run things

```bash
npm run dev          # local dev server at http://localhost:5173/
npm run build        # tsc -b && vite build
npm run lint         # eslint .
npx tsc -b           # type-check only
npm test             # full simulator-driven suite (vitest run)
npm run test:watch   # watch mode while iterating on a test
```

Stack: React 19 + Zustand 5 + Vite 7 + TypeScript 5.9. Tests: Vitest 4 + jsdom + node-canvas + `@testing-library/react`.

The simulator at [src/test/simulator.ts](src/test/simulator.ts) exposes:
- `runScript(commands, root)` — ordered `mouseDown / mouseMove / mouseUp / click / dblclick / keyDown / keyUp / type / wait` against rendered DOM.
- `pixelAt(canvas, x, y)` and `layerPixelAt(layer, x, y)` — read RGBA from the underlying real Canvas2D.
- `makeToolPointerEvent({ canvasX, canvasY, modifiers, pressure })` — synthesize a `ToolPointerEvent` for tool-level tests that bypass React.

[src/test/setup.ts](src/test/setup.ts) installs node-canvas as the backend for `HTMLCanvasElement.getContext('2d')` and exposes a global `ImageData`.
