# plan — 03-navigation

Four Feature specs. Bird's Eye View, Rotate View, Overscroll, Navigator are scope-excluded; Flick Panning and Continuous Zoom are deferred polish.

---

## 1. Goals

### 1.1 Feature spec — Zoom Tool clicks zoom at the click point + Scrubby Zoom drag

**What it does.** Clicking with the Zoom Tool zooms in / out around the clicked canvas pixel — the pan offsets so that pixel stays roughly under the cursor. Click-and-drag-right zooms in (Scrubby Zoom in); drag-left zooms out. Alt+click still zooms out.

**Photoshop habit preserved.** Zoom Tool default behavior. Click point stays under cursor. Scrubby Zoom on by default. Grounded in `photoshop-zoom/lesson.md:166-179, 213-231`.

**Invocation.**
- `Z` (existing) → Zoom Tool active.
- Click on canvas → zoom in around click point.
- Alt+click → zoom out around click point.
- Click and drag horizontally (>4px to disambiguate from click) → Scrubby Zoom: right = zoom in, left = zoom out.

**Pre-conditions.** Active tool is `zoom`.

**Interaction choreography.**
1. User selects Zoom Tool (Z or toolbar). Cursor becomes the zoom-in magnifier (`zoom-in`).
2. **Click-to-zoom-at-point** (no drag, mouse moves <4px between down and up):
   - On `pointerUp`, compute click position in document pixel coords.
   - Compute zoom factor: `0.5` if Alt held, else `2`.
   - Apply new zoom AND adjust pan so that the clicked pixel keeps its screen position. Math:
     - `newPan.x = clickScreen.x - clickDoc.x * newZoom`
     - `newPan.y = clickScreen.y - clickDoc.y * newZoom`
3. **Scrubby Zoom** (mouse moves >4px during the drag):
   - On `pointerDown`, anchor the drag start position.
   - On `pointerMove`, compute horizontal delta from anchor. Map `dx` → zoom factor:
     - `factor = exp(dx * 0.005)` (smooth exponential — slow at low dx, faster at large dx)
   - Apply new zoom anchored at the initial click point (same math as click-to-zoom).

**Visual feedback.** Cursor reflects modifier: `zoom-in` normally, `zoom-out` when Alt held.

**Post-conditions.** Zoom updated, pan updated to preserve click point. Falls within existing 0.05–32 range.

**Edge cases.**
- Click far outside canvas: zoom still applies; pan math clamps to existing bounds (already handled by Viewport).
- Mouse moves slightly (e.g. 3px) and releases: treated as click (no Scrubby Zoom).
- Multiple rapid clicks: each click compounds — exactly Photoshop's behavior.

---

### 1.2 Feature spec — Editable status-bar zoom % + Ctrl-hover scrubby slider

**What it does.** Replace the read-only zoom % in the StatusBar with a click-to-edit input. When `Ctrl/Cmd` is held while hovering, cursor becomes `ew-resize` and dragging horizontally scrubs the zoom value.

**Photoshop habit preserved.** Click-to-edit + Ctrl-hover scrubby slider. Grounded in `photoshop-zoom/lesson.md:36-66`.

**Invocation.**
- Click the zoom % text → input becomes editable (focus + select-all).
- Hold Ctrl/Cmd and hover → cursor becomes scrubby; drag horizontally to change zoom.

**Pre-conditions.** Status bar is visible (Standard Screen Mode).

**Interaction choreography.**
1. User clicks zoom %. The text turns into a focused `<input type="text">` containing the current percent (e.g. `100`). All text is selected.
2. User types a value (e.g. `200`).
3. User presses Enter → zoom updates to 200%, input commits, returns to text display.
4. User presses Esc → input reverts to the previous value.
5. User holds Ctrl/Cmd while hovering the zoom display. Cursor turns into `ew-resize`. On `pointerDown`, anchor; on drag, compute `newZoom = oldZoom * exp(dx * 0.005)`. Release returns cursor to default.

**Visual feedback.** Input field uses dark theme; focus ring uses `--accent-primary`. Scrubby cursor is browser-native `ew-resize`.

**Post-conditions.** Zoom changes immediately; pan unchanged.

**Edge cases.**
- Invalid input (e.g. "abc") → Enter does nothing visible; on blur, reverts to previous value.
- Value out of range (e.g. -50, 99999) → clamp to 5%–3200%.
- Trailing % sign in user input → strip before parse.

---

### 1.3 Feature spec — Double-click toolbar icons for Fit / 100%

**What it does.** Double-clicking the Hand Tool icon in the toolbar triggers Fit on Screen. Double-clicking the Zoom Tool icon triggers 100% (Actual Pixels). Single-click behavior unchanged.

**Photoshop habit preserved.** `photoshop-zoom/lesson.md:353-360`.

**Invocation.** Double-click on the Hand or Zoom toolbar icon.

**Pre-conditions.** None.

**Interaction choreography.**
1. User double-clicks Hand Tool button in toolbar.
2. The first click selects Hand Tool (existing behavior); the second click within the system double-click window triggers Fit on Screen.
3. Same for Zoom Tool → 100%.

**Visual feedback.** Layout snaps to fit (or jumps to 100%); no other UI change.

**Post-conditions.** Zoom changes; tool stays as Hand / Zoom.

**Edge cases.**
- Triple-click: second double = no-op (zoom is already at target). Fine.

---

### 1.4 Feature spec — Alt+wheel zoom + Spacebar+Cmd temp Zoom Tool

**What it does.** Adds `Alt/Option + mouse-wheel` to zoom (Photoshop's documented shortcut) alongside the existing `Ctrl+wheel` (kept for backward compat). Adds `Spacebar+Ctrl/Cmd` to temporarily switch to the Zoom Tool while the keys are held; adding `Alt` makes it zoom-out. Release any of the keys to restore the previous tool.

**Photoshop habit preserved.** `photoshop-zoom/lesson.md:204-208, 250-260`.

**Invocation.**
- Hover canvas → hold Alt → scroll wheel → zoom around cursor.
- Spacebar + Ctrl/Cmd → temp Zoom Tool. Click to zoom in at click point.
- Spacebar + Ctrl/Cmd + Alt → cursor becomes Zoom Out; click to zoom out.
- Release any modifier → restore previous tool.

**Pre-conditions.** Canvas focused / pointer over.

**Interaction choreography.**
1. User holds Alt + scrolls wheel:
   - Each scroll tick: `newZoom = clamp(oldZoom * (1 + sign(deltaY) * 0.1), 0.05, 32)`. Zoom anchored at cursor position (same anchor math as 1.1).
2. User holds Spacebar + Cmd:
   - First detected combo: cache `priorTool`, swap to `zoom` tool. Cursor: zoom-in.
3. With +Alt also held: cursor: zoom-out (the same `Alt` keydown is detected separately).
4. User clicks: triggers Zoom Tool click-at-point (same logic as 1.1).
5. User releases any one key: restore prior tool. Don't wait for both keys.

**Visual feedback.** Cursor changes as described.

**Post-conditions.** Tool reverts to prior on key release.

**Edge cases.**
- Spacebar handler already swaps to Hand. If Cmd is pressed AFTER Space, we promote Hand → Zoom. If Cmd is released first, drop back to Hand. If Space is released first, restore to original tool.
- Alt + Cmd + Space ordering: must work regardless of press order. Implementation reads `e.shiftKey/altKey/etc.` on every keydown and decides.

---

## 2. Out-of-scope-this-tick

- Bird's Eye View, Rotate View Tool, Overscroll, Navigator panel — CLAUDE.md §4 (`nav_extras` excluded).
- Multi-document zoom/pan (Cmd+Tab + sync zoom across docs) — multi-doc UI excluded.
- Flick Panning — touch convenience; defer.
- Continuous Zoom (press-and-hold to keep zooming) — polish; defer.
- Drag-rectangle zoom (Scrubby Zoom off variant) — Scrubby Zoom default ON; defer.
- Zoom-preset snapping (25/33.3/50/66.7/100…) on Cmd+/- — small but noisy; defer to a quick follow-up.
- "Enable Flick Panning" Preferences toggle — comes with Flick Panning.
- Pixel Grid auto-show beyond ~500% — defer (it's a visual debugging aid).

## 3. Files to edit / create

| Concern | Files |
|---|---|
| Zoom Tool zoom-at-point + Scrubby Zoom | edit [src/tools/handZoom.ts](src/tools/handZoom.ts). |
| Editable status-bar zoom + scrubby slider | edit [src/components/layout/StatusBar.tsx](src/components/layout/StatusBar.tsx). |
| Toolbar double-click | edit [src/components/Panels/Toolbar.tsx](src/components/Panels/Toolbar.tsx). |
| Alt+wheel zoom + Spacebar+Cmd temp Zoom | edit [src/components/Canvas/Viewport.tsx](src/components/Canvas/Viewport.tsx) (wheel) + edit [src/App.tsx](src/App.tsx) (temp-tool swap). |
| Tests | **new** `src/test/03-navigation.test.tsx`. |

5 files (1 new). Under stop bar.

## 4. Test cases

- Click Zoom Tool at canvas point (200,300) with zoom=1 — after click, `zoom===2` AND pan adjusted so (200,300) stays under the cursor.
- Alt+click Zoom Tool — zooms out (zoom===0.5 from 1).
- Scrubby Zoom right — drag from x=100 to x=300, zoom increases.
- Status bar zoom: click the percent → input appears focused; type `200` Enter → zoom===2.
- Status bar zoom: Esc reverts.
- Double-click Hand Tool toolbar icon → triggers Fit on Screen (event dispatch). Existing fit behavior is tested elsewhere; here we assert the event/state.
- Double-click Zoom Tool toolbar icon → zoom===1 (100%).
- Alt+wheel up over (300,400) → zoom increases AND pan adjusts to anchor at (300,400).

## 5. Divergences from Photoshop

1. **No Bird's Eye View, Rotate View, Overscroll, Navigator panel** — scope (CLAUDE.md §4).
2. **Ctrl+wheel keeps zooming** (in addition to new Alt+wheel) — Photoshop reserves Ctrl+wheel for horizontal pan. We keep our existing Ctrl=zoom because most browser users have it in muscle memory and we can't easily reclaim it. *Tactical divergence — both bindings work; muscle memory bridged.*
3. **No Continuous Zoom, no Flick Panning, no drag-rect zoom** — convenience polish deferred.
4. **No zoom-preset snapping on Cmd+/-** — defer (small follow-up).

## 6. Stop conditions specific to this cluster

- Stop if zoom-at-point math doesn't converge cleanly. The transform is canvas-space-coords → screen-coords via `screen = pan + doc * zoom`; new pan should be `screenAnchor - docAnchor * newZoom`. Anchor is the click point in canvas space.
- Stop if Spacebar+Cmd ordering creates an unrecoverable tool-swap state (e.g. user releases Space first vs Cmd first). The handler tracks a single `priorTool` and restores on first release.
