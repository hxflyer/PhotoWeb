# gap-report — 03-navigation

## Lessons reviewed

- `photoshop-image-navigation` — chapter index linking out to the other navigation lessons.
- `photoshop-zoom` — the comprehensive walkthrough: Z (Zoom Tool), H (Hand Tool), Ctrl/Cmd+0 Fit, Ctrl/Cmd+1 100%, Ctrl/Cmd+/- Zoom In/Out with preset snapping (25 / 33.3 / 50 / 66.7 / 100 / 200 / 400 / 800%), click status-bar zoom % to type a value, Ctrl/Cmd-hover-on-zoom% → scrubby slider, Zoom Tool click-to-zoom-at-point, Alt+click to zoom out, Scrubby Zoom (drag left/right in Options Bar), drag-rectangle zoom (with Scrubby Zoom off), Continuous Zoom (press-and-hold), Hand Tool drag, Spacebar = temp Hand Tool, Spacebar+Ctrl/Cmd = temp Zoom Tool, Spacebar+Ctrl+Alt = temp Zoom Out, Alt+scroll wheel = zoom, plain scroll = pan, double-click Hand Tool icon → Fit on Screen, double-click Zoom Tool icon → 100%, Flick Panning, Pixel Grid auto-shows beyond ~500% (View > Show > Pixel Grid).
- `photoshop-image-navigation-tips-tricks-and-shortcuts` / `photoshop-image-navigation-tips-tricks-shortcuts` / `image-navigation-essentials-zooming-panning-photoshop` — overlapping deep-dives on the same surface. Identical content to `photoshop-zoom` plus the document-tab zoom-percent display.

## Current photoweb coverage

- [src/core/shortcuts.ts:69-72](src/core/shortcuts.ts#L69-L72) — Zoom In (⌘+), Zoom Out (⌘-), Fit on Screen (⌘0), Actual Pixels (⌘1) registered.
- [src/core/shortcuts.ts:106-107](src/core/shortcuts.ts#L106-L107) — Hand (H), Zoom (Z) registered.
- [src/App.tsx:590-618](src/App.tsx#L590-L618) — Spacebar = temporary Hand Tool. ✓
- [src/tools/handZoom.ts:6-24](src/tools/handZoom.ts#L6-L24) — `handTool` drags the pan offset. ✓
- [src/tools/handZoom.ts:26-37](src/tools/handZoom.ts#L26-L37) — `zoomTool` doubles or halves the zoom on click. ⚠️ Zooms relative to the canvas center, NOT the click point. No scrubby drag, no drag-rect, no continuous zoom.
- [src/components/Canvas/Viewport.tsx:752-763](src/components/Canvas/Viewport.tsx#L752-L763) — mouse wheel: Ctrl+wheel zooms, plain wheel pans. ⚠️ Photoshop uses Alt+wheel for zoom; we'd want to support both.
- [src/components/layout/StatusBar.tsx](src/components/layout/StatusBar.tsx) — shows zoom % as static text, no click-to-edit, no scrubby slider.

## Gaps

| # | Gap | Where |
|---|---|---|
| 1 | Zoom Tool zooms about the canvas center, not the click point. | [src/tools/handZoom.ts:30-36](src/tools/handZoom.ts#L30-L36). |
| 2 | No Scrubby Zoom (drag-left/right in Zoom Tool). | Same file. |
| 3 | No drag-rect zoom (Scrubby Zoom off + drag selection). | Same file + Options Bar config (drop for now; Scrubby Zoom default ON in Photoshop). |
| 4 | No Continuous Zoom (press-and-hold to keep zooming). | Same file. |
| 5 | Status bar zoom % is static; can't click to type, no Ctrl/Cmd-hover scrubby slider. | [src/components/layout/StatusBar.tsx](src/components/layout/StatusBar.tsx). |
| 6 | Double-click Hand Tool icon → Fit on Screen; double-click Zoom Tool icon → 100%. | [src/components/Panels/Toolbar.tsx](src/components/Panels/Toolbar.tsx). |
| 7 | Alt+wheel doesn't zoom; only Ctrl+wheel does. | [src/components/Canvas/Viewport.tsx:752-763](src/components/Canvas/Viewport.tsx#L752-L763). |
| 8 | Spacebar+Ctrl/Cmd = temp Zoom Tool in, Spacebar+Ctrl+Alt = temp Zoom Out — not wired. | [src/App.tsx](src/App.tsx) Spacebar handler. |
| 9 | Zoom presets (25/33.3/50/66.7/100/200/400/800/1600/3200/6400/12800%) don't snap when Ctrl+/- fires; we likely use small increments. | [src/App.tsx](src/App.tsx) zoom-in/out handler, OR the View menu action. |

## Photoshop-habit mismatches

1. **Zoom Tool zooms at the click point.** Photoshop: clicking with the Zoom Tool zooms toward whatever pixel you clicked on; the pan offsets so that pixel stays roughly under the cursor. Photoweb: zoom doubles, but the pan doesn't shift, so the clicked area moves off-screen. Grounded in `photoshop-zoom/lesson.md:166-169` (description) and screenshots showing the click point staying centered.
2. **Status bar zoom display is interactive.** Photoshop's bottom-left zoom-percent is double-clickable to type a value, and Ctrl/Cmd-hover turns the cursor into a scrubby slider. Grounded in `photoshop-zoom/lesson.md:36-66`.
3. **Double-clicking Hand Tool / Zoom Tool toolbar icons** is a documented Photoshop shortcut. Grounded in `photoshop-zoom/lesson.md:353-360`.
4. **Alt+wheel = zoom; plain wheel = pan; Ctrl+wheel = pan horizontal.** Grounded in `photoshop-zoom/lesson.md:250-260, 319-325`. Photoweb's Ctrl+wheel=zoom inverts this.
5. **Zoom level snaps to presets** when using Ctrl+/-. Grounded in `photoshop-zoom/lesson.md:87-112`. Otherwise users get blurry intermediate zooms.
6. **Spacebar+Ctrl = temp Zoom In; +Alt = temp Zoom Out.** Grounded in `photoshop-zoom/lesson.md:204-208`. We have temp Hand on Space; the Zoom variants are missing.

## UI / UX issues separate from §4

- Mouse-wheel zoom amount is too aggressive on touchpads (e.g. `0.001 * deltaY` accumulates fast); leave for a future tuning pass.

## Photoshop divergences worth keeping (or permanent)

- **No Bird's Eye View** — CLAUDE.md §4 excludes `nav_extras`.
- **No Rotate View Tool** — `nav_extras` excluded.
- **No Overscroll** — `nav_extras` excluded.
- **No Navigator panel** — `nav_extras` excluded.
- **No multi-document zoom/pan-all-at-once** — multi-doc excluded (CLAUDE.md §4 `multi_doc_ui`).
- **No Flick Panning** — touch / mouse-throw convenience; defer.
- **No drag-rectangle zoom** in Zoom Tool — Scrubby Zoom default ON; this alternative needs an Options Bar toggle. Defer to a polish pass.
- **No Continuous Zoom (press-and-hold)** — polish; defer.
- **No `Ctrl+wheel = pan horizontal`** when we keep `Ctrl+wheel = zoom`. Photoshop's `Ctrl+wheel`=horizontal-pan conflicts with photoweb's existing zoom binding. We'll add Alt+wheel = zoom but leave Ctrl+wheel = zoom for backward compat; pan-horizontal can ride the touchpad's native horizontal delta. Log as a tactical divergence.
- **No "Enable Flick Panning" preference** in Preferences > Tools — would land with Flick Panning.
