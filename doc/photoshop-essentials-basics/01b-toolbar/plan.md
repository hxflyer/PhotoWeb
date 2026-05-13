# plan — 01b-toolbar

Three Feature specs land in this tick. Each preserves the Photoshop habit and lists every alternate invocation. No new tools are added — that's per-tool-cluster scope.

---

## 1. Goals

### 1.1 Feature spec — Click-and-hold flyout

**What it does.** Pressing-and-holding (~300ms) on any tool icon that has hidden tools opens the same flyout already used by right-click — listing the primary + sub-tools. A short click (release before threshold) keeps the existing "select the displayed tool" behavior.

**Photoshop habit preserved.** Lesson body line 56: *"click and hold on the icon. Or right-click (Win) / Control-click (Mac) on the icon."* Both gestures must work; press-and-hold is the primary, right-click is the keyboard-alternate. Cursor stays the default arrow throughout. Screenshot ground: `photoshop-tools-toolbar-overview/images/interface-tools-photoshop-toolbar-selecting-tools-6517b8e0.png` (flyout listing the 4 marquee tools).

**Invocation.**
- `mousedown` on a tool icon, hold for ≥300ms without moving (>4px) → flyout opens.
- Right-click (existing path) → flyout opens.

**Pre-conditions.** Tool group must have at least one `subs` entry. Groups with only a primary (e.g. Move, Crop) ignore the gesture and behave as a normal click.

**Interaction choreography.**
1. User moves cursor over a tool with hidden tools (chevron indicator visible). Cursor: default arrow.
2. User presses left mouse button (`mousedown`). A 300ms timer arms; `mousedown` does NOT trigger any tool change yet.
3. **Path A — short tap (release before 300ms):** the timer is cancelled on `mouseup`. The displayed tool activates (the existing "click selects" behavior). Flyout does not open.
4. **Path B — drag during hold (cursor moves >4px before 300ms):** timer is cancelled. Treated as a non-event. Flyout does not open. The tool does not activate (Photoshop suppresses activation when the user "abandons" a press).
5. **Path C — true hold (300ms+ with no drag):** flyout opens to the right of the button, anchored at the button's top-right corner. The primary + sub-tools render with icon, label, and shortcut letter. Releasing the mouse does NOT activate any tool from this same press (suppressed via `holdSuppressClickRef`); the user then clicks a flyout item separately.
6. User clicks a sub-tool item: tool activates, `groupActive` updates, flyout closes.
7. User clicks outside the flyout: flyout closes without changing tool.
8. User presses `Esc`: flyout closes without changing tool.

**Visual feedback.**
- Flyout uses the same component already rendered at [Toolbar.tsx:396-444](src/components/Panels/Toolbar.tsx#L396-L444). No new visual style.
- Active tool highlighted in flyout with `hsl(var(--accent-primary))` background — unchanged.
- No "pressing" animation on the button while holding (Photoshop doesn't depress the button during the hold).

**Post-conditions.** If a sub-tool was selected, the store's `activeTool` updates and `groupActive[gi]` records the new last-used. No history entry — tool selection is chrome state.

**Edge cases.**
- Hold on a tool group with NO subs (e.g. Move, Crop): 300ms timer still arms but on fire, do nothing. The release activates the tool normally.
- Hold then `mouseleave` the button: cancel the timer. Don't open the flyout. Don't activate the tool. Treat like a drag-abandon.
- Multiple simultaneous mousedowns (touch + mouse): single hold per group; the most recent gesture wins.
- Hold opens flyout, user clicks outside: existing outside-click handler closes the flyout. ✓ already works.

---

### 1.2 Feature spec — Single/double column toggle

**What it does.** Adds a `>>` / `<<` button at the very top of the toolbar that toggles the toolbar between Photoshop's single-column layout (default, narrow) and double-column layout (shorter, wider). The choice persists.

**Photoshop habit preserved.** Lesson body line 28-32: *"By default, the toolbar appears as a long, single column. But it can be expanded into a shorter, double column by clicking the double arrows at the top. Click the double arrows again to return to a single column toolbar."* `>>` icon shown in single-column mode (signals "expand right"), `<<` in double-column mode (signals "collapse left"). Screenshots: `interface-tools-photoshop-toolbar-c8bde493.png` shows `>>` at top of single-column; `interface-tools-photoshop-double-column-toolbar-a03bf319.png` shows `<<` at top of double-column with the 70-tool layout reorganized into pairs.

**Invocation.** Click the `>>` (or `<<`) button at the top of the toolbar. There is no keyboard shortcut in Photoshop; we don't add one either.

**Pre-conditions.** None.

**Interaction choreography.**
1. User clicks the `>>` button at the top of the toolbar.
2. The toolbar column expands from `48px` to `84px` (room for two `36px` buttons + gaps).
3. Tools rearrange into pairs: each `TOOL_GROUPS` entry pair fills one row in the double-column layout, with separators (`SEP_BEFORE`) spanning both columns.
4. The icon flips from `>>` to `<<`.
5. Click `<<` to return to single column; reverse animation, icon flips back to `>>`.
6. The column width on the page reflows immediately (CSS grid `gridTemplateColumns` change); the canvas resizes.

**Visual feedback.**
- `>>` / `<<` rendered as `lucide-react` `ChevronsRight` / `ChevronsLeft` at 14px in the same color as the tool icons.
- Button height `24px`, sits above the existing Import-Image button.
- No animation on the switch — instant width change matches Photoshop's snap.

**Post-conditions.** `toolbarColumns: 1 | 2` persists in localStorage under `photoweb:chromePrefs:v1` alongside the other chrome prefs.

**Edge cases.**
- Tool flyout was open when the toggle fires: close it first (a wider toolbar invalidates the flyout's anchor position).
- Toggle during a tool gesture (e.g. dragging a marquee): the layout change should not interrupt the canvas drag. Since the toggle is a button click outside the canvas, this is naturally insulated.
- Window narrower than 84px (very small viewport): allow it; the canvas area will shrink. We don't enforce a min viewport size.

---

### 1.3 Feature spec — Default-tool memory persistence

**What it does.** The existing `groupActive` map (last-used sub-tool per group) gets persisted to localStorage and restored on reload. A returning user sees the same tool selected per group as when they left.

**Photoshop habit preserved.** Lesson body lines 67-73: *"each spot in the toolbar displays either the default tool or the last tool selected."* This is a persistent expectation — Photoshop remembers across sessions.

**Invocation.** Implicit. Any sub-tool selection triggers a write; mount restores.

**Pre-conditions.** None.

**Interaction choreography.**
1. User picks Magic Wand under W group via flyout. `groupActive[wandGroupIdx] = 'magic-wand'` is set.
2. Persist write fires (same pattern as colorTheme, pasteboardColor, etc.).
3. User closes/refreshes the page.
4. App boot restores from localStorage; `groupActive` initial state contains `{ wandGroupIdx: 'magic-wand' }`.
5. The W group's button shows the Magic Wand icon, not the default Quick Selection.

**Visual feedback.** No new UI. Restoration is invisible — the toolbar simply shows the right icons.

**Post-conditions.** `groupActive` lives in `viewSlice` (replacing local component state). Persistence at `photoweb:chromePrefs:v1` as `toolbarGroupActive: Record<number, ToolId>`.

**Edge cases.**
- LocalStorage contains a stale `toolId` for a group whose subs changed (e.g. a tool was removed in a later build): on restore, validate against the current `TOOL_GROUPS`; if the recorded tool is no longer in the group, fall back to the primary.
- LocalStorage unavailable: in-memory only (matches existing pattern).

---

## 2. Out-of-scope-this-tick

- **Adding any missing tools to TOOL_GROUPS.** Magnetic Lasso, Object Selection, Mixer Brush, Color Replacement, Pattern Stamp, History/Art History Brush, Blur/Sharpen/Smudge, Curvature Pen, Triangle, Color Sampler/Ruler/Note/Count, Type Mask, Single Row/Column Marquee — all handled by their per-tool clusters (13, 14a, 15, 19a, 20a, 26b, etc.).
- **Tool reordering** in double-column mode. Photoshop has a hand-curated pairing in double-column mode (e.g. Move pairs with Artboard). We just flow `TOOL_GROUPS` two-up; differences will be cosmetic and unlikely to trip a Photoshop user.
- **Touch / pen gestures** for press-and-hold. Mouse-only here; touch flows can match later.
- **Slide-and-release sub-tool selection.** Photoshop also supports a single-gesture flow (press, slide cursor to a flyout item, release to select). photoweb's flyout opens on hold but requires a separate click to pick. Adding slide-and-release needs document-level mouseup capture that's straightforward but a polish; defer.
- **Customize-toolbar UI.** CLAUDE.md §4 excludes (`toolbar_customization`).
- **Asterisk indicators (`*`) on default tools in the flyout.** Photoshop's actual flyout screenshot (`interface-tools-photoshop-toolbar-selecting-tools-6517b8e0.png`) does NOT render asterisks — they appear only in the lesson's reference list. We don't add them.

## 3. Files to edit / create

| Feature | Files |
|---|---|
| 1.1 Click-and-hold flyout | edit [src/components/Panels/Toolbar.tsx](src/components/Panels/Toolbar.tsx) (mousedown timer + mouseup/mouseleave cancel) |
| 1.2 Single/double column toggle | edit [src/components/Panels/Toolbar.tsx](src/components/Panels/Toolbar.tsx) (header button + grid/flex re-layout); edit [src/components/layout/MainLayout.tsx](src/components/layout/MainLayout.tsx) (read `toolbarColumns` and switch `gridTemplateColumns` between `48px ...` and `84px ...`); edit [src/store/types.ts](src/store/types.ts) + [src/store/viewSlice.ts](src/store/viewSlice.ts) (`toolbarColumns` + setter + persist) |
| 1.3 Default-tool memory | edit [src/components/Panels/Toolbar.tsx](src/components/Panels/Toolbar.tsx) (move `groupActive` from local state to store); edit [src/store/types.ts](src/store/types.ts) + [src/store/viewSlice.ts](src/store/viewSlice.ts) (`toolbarGroupActive` + setter + persist) |
| Tests | **new** `src/test/01b-toolbar.test.tsx` |

Estimated ~6 files (1 new, 5 edited). Well under the 40-file stop bar.

## 4. Test cases

- **Click-and-hold** — `mouseDown` on the marquee button, advance fake timers by 350ms, assert the flyout is open; assert the displayed tool did NOT activate (the active tool stayed what it was before the gesture).
- **Short tap activates** — `mouseDown` + `mouseUp` within 100ms, assert the tool activated AND flyout did not appear.
- **Drag cancels** — `mouseDown`, `mouseMove` 20px away, advance 400ms, assert no flyout AND no activation.
- **Right-click still works** — `contextMenu` event on a tool with subs, assert flyout open immediately (no timer).
- **Toolbar single/double column toggle** — click the `>>` button, assert `toolbarColumns === 2` and a `<<` button is visible.
- **Column toggle persists** — set to double, simulate "reload" (re-mount), assert column count is 2.
- **Default-tool memory persists** — open W flyout, click Magic Wand, simulate reload, assert the W button now shows the Magic Wand icon and `groupActive` in store matches.
- **Group active falls back to primary if stored sub no longer exists** — write a bogus stored toolId, mount, assert the W group shows Quick Selection (the primary).

## 5. Divergences from Photoshop

1. **Double-column layout flows `TOOL_GROUPS` two-up rather than mirroring Photoshop's curated pairings.** Photoshop pairs Move↔Artboard, Rectangular Marquee↔(empty), etc. Since photoweb excludes several Photoshop tools (Artboard, Frame, Rotate View, 3D variants, Slice…), Photoshop's exact pairings can't be reproduced; the flow-2-up pairing is the closest non-broken alternative. *Scope constraint (CLAUDE.md §4 exclusions).*
2. **No `*` asterisk on default tools in the flyout.** Photoshop's flyout screenshot shows no asterisks; the lesson's documentation uses `*` to mark defaults in its reference list, but the UI itself doesn't render them. We match the actual UI, not the lesson body. *Habit preserved — same as Photoshop's actual flyout.*
3. **Press-and-hold threshold is 300ms.** Photoshop's threshold isn't published; 300ms is a reasonable default that doesn't fight short taps. *Defensible default.*

## 6. Stop conditions specific to this cluster

- Stop if implementing double-column requires reshuffling more than `TOOL_GROUPS`. The double-column layout should be a presentation concern of `Toolbar.tsx` alone; if it leaks into MainLayout or other panels, write HUMAN-REVIEW.md.
- Stop if click-and-hold breaks any existing per-tool test. Toolbar.tsx is touched by many tests; we expect zero regressions.
