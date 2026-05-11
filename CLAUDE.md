# CLAUDE.md — photoweb operating guide

This file is Claude's compact operating guide for photoweb. Read it first on every session. Track active feature work in the implementation backlog, not here. Keep this file focused on durable workflow, scope, architecture, and conventions.

---

## 1. Mission

Build photoweb: a browser-based, layer-aware raster editor that feels like Photoshop for ~80% of common photo-editing tasks. Lightweight in scope, professional in finish. Curated subset; not Photoshop parity.

---

## 2. Where everything lives

| What | Where |
|---|---|
| **Current scoped development plan** | [doc/photoshop-desktop-study/photoweb-development-plan.md](doc/photoshop-desktop-study/photoweb-development-plan.md) |
| **Parallel development plan** (tracks + batches + chokepoints) | [doc/photoshop-desktop-study/photoweb-parallel-development-plan.md](doc/photoshop-desktop-study/photoweb-parallel-development-plan.md) |
| **Implementation changelog** | [doc/photoshop-desktop-study/CHANGELOG.md](doc/photoshop-desktop-study/CHANGELOG.md) |
| **Implementation backlog** | [doc/photoshop-desktop-study/photoweb-implementation-backlog.md](doc/photoshop-desktop-study/photoweb-implementation-backlog.md) |
| **User-case matrix** | [doc/photoshop-desktop-study/photoweb-user-cases.md](doc/photoshop-desktop-study/photoweb-user-cases.md) |
| Photoshop source notes | [doc/photoshop-desktop-study/pages/](doc/photoshop-desktop-study/pages/) |
| Photoshop source note images | [doc/photoshop-desktop-study/images/](doc/photoshop-desktop-study/images/) |
| Source PDFs (Photoshop guides, reference only) | [doc/](doc/) — `*.pdf` and extracted `*.txt` |
| Source code | [src/](src/) |
| Store entry point | [src/store/editorStore.ts](src/store/editorStore.ts) |
| Canvas viewport | [src/components/Canvas/Viewport.tsx](src/components/Canvas/Viewport.tsx) |
| Layer model | [src/core/Layer.ts](src/core/Layer.ts) |
| Filter system | [src/filters/](src/filters/) |
| Existing components | [src/components/](src/components/) — `Canvas/`, `Panels/`, `Dialogs/`, `layout/` |
| Permissions config | [.claude/settings.local.json](.claude/settings.local.json) |

When in doubt, the scoped development plan and implementation backlog are authoritative. If scope changes, update those docs first, then the code.

---

## 3. Architecture

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
│    timeline + active cursor; command actions and snapshots     │
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

### File layout
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

## 4. Scope Guardrails

Photoweb is a focused browser photo editor, not a full Photoshop clone. Use [photoweb-development-plan.md](doc/photoshop-desktop-study/photoweb-development-plan.md) and [photoweb-implementation-backlog.md](doc/photoshop-desktop-study/photoweb-implementation-backlog.md) to decide what to build next.

Build features that improve browser-based photo editing: history, layers, masks, selections, retouching, layer styles, shape/text basics, guides/snap, presets, stability, and storage/performance diagnostics.

Do not implement these unless the user explicitly changes scope:
- AI/generative features or complex content synthesis.
- Cloud accounts, collaboration, sharing, Adobe integrations, or remote asset services.
- Print production, CMYK, spot colors, separations, printer setup, or prepress workflows.
- Video, timeline, animation, or animated export.
- Help, release notes, FAQ, documentation browser, or product-support features inside the app.
- Smart Objects, Smart Filters, PSD parity, Actions, droplets, batch automation, or scripting engines.
- Professional export expansion such as layer export, scaled export sets, metadata editing, or advanced file-format parity unless added to the backlog.

---

## 5. Standard Operating Procedure (every task)

Follow this loop without skipping steps. The point is reproducible quality.

1. **Read state.** Skim this CLAUDE.md, [photoweb-development-plan.md](doc/photoshop-desktop-study/photoweb-development-plan.md), and the relevant backlog item before touching code. Also read the related Photoshop source note(s) in [doc/photoshop-desktop-study/pages/](doc/photoshop-desktop-study/pages/) and inspect any matching images in [doc/photoshop-desktop-study/images/](doc/photoshop-desktop-study/images/) so the UI behavior, buttons, cursors, panels, and terminology are grounded in the reference material. If the task references an existing file, read it.
2. **Pick the next unchecked task** from [photoweb-implementation-backlog.md](doc/photoshop-desktop-study/photoweb-implementation-backlog.md), in order. Do not skip ahead unless a dependency forces it (and note the reason).
3. **Plan the change.** State (in chat) what files will change and what the contract of the new code is. Keep it to a few sentences. If the change is non-trivial, list the steps before starting.
4. **Implement.** Edit existing files; create new ones only when the layout in §3 calls for it. Match the existing TS/React style. No new dependencies without flagging it.
5. **Verify (in this order):**
   - `npx tsc -b` — must exit 0.
   - `npm run lint` — no new errors. (Existing pre-task errors stay; you don't fix unrelated lint debt unless asked.)
   - **`npm test` — must pass, including a NEW test that exercises this feature.** Every feature/fix gets a simulator-driven test in `src/test/<area>.test.ts(x)`. The test scripts user input (mouse / keyboard / button click) via [src/test/simulator.ts](src/test/simulator.ts) and asserts on store state, layer pixels (real Canvas2D via node-canvas), or selection paths. Test names should read like the user's action ("clicking + adds a layer", "marquee drag with Shift constrains to a square", "paint bucket floods to primary color"). For UI-level tests, render the React component with `@testing-library/react` and dispatch events via `runScript`. For tool-level tests, call `getTool(id).onPointerXxx` directly with `makeToolPointerEvent(...)`. For visual results, compare specific pixels with `layerPixelAt` / `pixelAt`. Tests catch regressions and surface real bugs (the paint-bucket seed-color regression was caught this way).
   - For UI-affecting work: run `npm run dev` if no dev server is active, open `http://localhost:5173/`, and test the golden path plus the most likely regression.
6. **Update the checkbox.** Edit [photoweb-implementation-backlog.md](doc/photoshop-desktop-study/photoweb-implementation-backlog.md). Tick the requirement there. If you discovered new sub-tasks while working, add them as new backlog items rather than expanding scope silently.
7. **Brief end-of-task summary** in chat: what changed, what was verified, anything punted.
8. **Stop.** Do not start the next task without the user's go-ahead, unless the user has said "keep going" or set up a loop.

### Definition of done (per task)
- TypeScript compiles.
- Lint is no-worse-than-before.
- `npm test` is green AND includes at least one new simulator-driven test for this feature.
- Behavior verified (visual or logical) for the task's scope.
- Requirement ticked in [photoweb-implementation-backlog.md](doc/photoshop-desktop-study/photoweb-implementation-backlog.md).
- No half-implementations, no `// TODO: implement later` left in the path.

### When in doubt
- **Scope or plan disagreement:** update [photoweb-development-plan.md](doc/photoshop-desktop-study/photoweb-development-plan.md) or [photoweb-implementation-backlog.md](doc/photoshop-desktop-study/photoweb-implementation-backlog.md) first, get sign-off when the change is meaningful, then code.
- **Architectural temptation outside the plan:** stop, ask the user. Adding a "small" abstraction is how scope explodes.
- **Tool prompts you for permission:** add the pattern to [.claude/settings.local.json](.claude/settings.local.json) if it's safe and recurring; otherwise ask.

---

## 6. Active Backlog

Use [photoweb-implementation-backlog.md](doc/photoshop-desktop-study/photoweb-implementation-backlog.md) as the only active todo list. Do not add feature tasks to this file.

Current synced focus: history, layer foundation, Properties shell, adjustment/fill/mask editing, selection basics, brush/pattern preset foundations, draggable guides, preferences/storage usage, and the first layer-effect set are implemented. Continue with the next scoped gap in [photoweb-parallel-development-plan.md](doc/photoshop-desktop-study/photoweb-parallel-development-plan.md): real editable shape layers (`SHAPE-01`), Type Properties undo coverage (`PROPS-04`), non-AI retouch tools, true Select and Mask output destinations, storage/autosave diagnostics, and remaining practical layer effects.

When a requirement is completed, update its status in the backlog after tests pass. If new follow-up work is discovered, add it to the backlog as a separate requirement instead of reopening a stale checklist here.

---

## 7. Conventions

- **Photoshop vocabulary** in all UI strings, menu items, panel names, and tooltips. Match the scoped plan, backlog, and relevant Photoshop source notes.
- **No emojis** in code, comments, or UI.
- **No new comments** unless the *why* is non-obvious — see the global instruction.
- **No new dependencies** without flagging it in chat first. Exception: types-only packages.
- **Imports:** use the existing path style (relative). No path aliases unless we add them deliberately.
- **TS strictness:** keep `tsconfig.app.json` strict. Never `@ts-ignore` or `any` to silence errors — fix the type.
- **Naming:** `camelCase` for files matching React components stay `PascalCase.tsx`; tools are lowercase noun (`brush.ts`, `cloneStamp.ts`).
- **Generated UI icons/images:** if a simple icon or pixel-art UI asset is needed, generate it with [scripts/icon_grid.py](scripts/icon_grid.py) and import the saved asset in the UI. Do not draw ugly ad hoc icons at runtime with CSS boxes, canvas strokes, or inline placeholder graphics when a crisp generated asset would be clearer. Prefer SVG for interface icons; use PNG only when raster output is specifically useful.

### Icon generation helper

Use [scripts/icon_grid.py](scripts/icon_grid.py) for toolbar icons, panel buttons, small state markers, and other simple UI graphics. Store generated assets under `src/assets/icons/` unless a feature already has a more specific asset folder.

Python usage:

```python
from scripts.icon_grid import save_icon

save_icon(
    [
        "..#..",
        ".###.",
        "#####",
        "..#..",
        "..#..",
    ],
    "src/assets/icons/arrow-up.svg",
    palette={".": None, "#": "#d7d7d7"},
    cell=4,
)
```

CLI usage:

```bash
python3 scripts/icon_grid.py '["..#..",".###.","#####","..#..","..#.."]' \
  src/assets/icons/arrow-up.svg \
  --palette '{".":null,"#":"#d7d7d7"}' \
  --cell 4
```

Grid rules:
- Each row must have the same length.
- `.` or `None` means transparent.
- Palette values accept `#RGB`, `#RGBA`, `#RRGGBB`, or `#RRGGBBAA`.
- Use small, intentional grids first; scale with `cell` instead of hand-drawing larger shapes.

---

## 8. How to run things

```bash
npm run dev      # start local dev server at http://localhost:5173/
npm run build    # tsc -b && vite build
npm run lint     # eslint .
npx tsc -b       # type-check only
npm test         # run the full simulator-driven suite once
npm run test:watch  # watch mode while iterating on a test
```

Test infrastructure: Vitest + jsdom + node-canvas (real Canvas2D for pixel inspection) + @testing-library/react. The simulator at [src/test/simulator.ts](src/test/simulator.ts) exposes:
- `runScript(commands, root)` — runs an ordered list of `mouseDown / mouseMove / mouseUp / click / dblclick / keyDown / keyUp / type / wait` against rendered DOM.
- `pixelAt(canvas, x, y)` and `layerPixelAt(layer, x, y)` — read RGBA from the underlying real Canvas2D.
- `makeToolPointerEvent({ canvasX, canvasY, modifiers, pressure })` — synthesize a `ToolPointerEvent` for tool-level tests that bypass React.

The `src/test/setup.ts` file installs node-canvas as the backend for `HTMLCanvasElement.getContext('2d')` and exposes a global `ImageData`.
