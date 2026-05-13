# plan — 01c-panels

Four Feature specs land in this tick. Drag-between-groups and the secondary icon column are deferred.

---

## 1. Goals

### 1.1 Feature spec — Tab close affordances (`☰` panel menu + right-click tab)

**What it does.** Adds a `☰` icon at the top-right of each panel group; clicking it opens a small menu with `Close` and `Close Tab Group`. Right-clicking any tab in any group opens the same menu, scoped to that tab's panel.

**Photoshop habit preserved.** `☰` icon position (top-right of group, right of any chevron); `Close` / `Close Tab Group` exact labels; both gestures terminate at the same outcome — `Close` removes only the active panel, `Close Tab Group` removes every panel in the group. Screenshots: `managing-panels-photoshop-cc/images/interface-panels-photoshop-select-and-close-panel-8ba0a991.png` (`☰` location), `…-close-panel-14edd087.png` (menu content with Close / Close Tab Group at the bottom).

**Invocation.**
1. Click the `☰` icon → menu opens anchored at the icon.
2. Right-click any tab → menu opens at cursor; "Close" closes that tab's panel, "Close Tab Group" closes its group.

**Pre-conditions.** Group has ≥1 visible panel.

**Interaction choreography.**
1. User hovers `☰` → cursor stays default arrow, icon color brightens.
2. User clicks `☰`:
   - Menu opens at icon's bottom-right corner.
   - Two items: `Close` (closes the active panel only), `Close Tab Group` (closes all panels in the group).
3. User picks `Close` → store updates `panelVisibility[active]` = false; if group becomes empty, the group's chrome (tabs row, chevron, ☰) hides too.
4. User picks `Close Tab Group` → every panel in the group has its visibility set to false; group's chrome hides.
5. User right-clicks a tab → same menu opens at cursor; `Close` scoped to that tab's panel, `Close Tab Group` scoped to the same group.
6. `Esc` or outside-click closes the menu without changing visibility.

**Visual feedback.** Menu uses the same styling as the existing LayersPanel context menu (`hsl(var(--bg-header))` background, `var(--shadow-menu)` shadow). `☰` icon: lucide `Menu` 13px, `hsl(var(--text-muted))` → `hsl(var(--text-main))` on hover.

**Post-conditions.** `panelVisibility` updated for the closed panel(s). The Window menu's checkmark for that panel(s) automatically updates because it reads from `panelVisibility`.

**Edge cases.**
- Active panel is closed while another panel in the group remains visible → group keeps rendering; the first remaining `visibleTabs` entry becomes active.
- All panels in the group hidden → group renders nothing (existing `if (visibleTabs.length > 0)` guards already handle this).
- Right-click on the active tab — same menu, same result.
- Right-click on a non-active tab — menu opens, but "Close" closes THAT tab's panel (not the active one). The active panel selection in the group doesn't change.

---

### 1.2 Feature spec — Drag-to-reorder tabs within a group

**What it does.** Tabs in a group can be dragged left/right to reorder them. The order is per-group and persists across reloads.

**Photoshop habit preserved.** Drag a tab horizontally inside its group; release to drop. Lesson body lines 77-89 (CC) / 52-62 (CS6). The blue drop-indicator between target tabs matches Photoshop's behavior.

**Invocation.** `mousedown` on a tab, drag horizontally, `mouseup` over the target position within the same group.

**Pre-conditions.** Group has ≥2 visible tabs.

**Interaction choreography.**
1. User presses mouse on a tab. Cursor: default arrow.
2. User drags horizontally. The dragged tab visually lifts (HTML5 `drag` opacity). A vertical insertion bar (`hsl(var(--accent-primary))`, 2px wide, full tab-row height) appears between the two tabs nearest the cursor.
3. User releases over a position. The bar's position becomes the new index for the dragged tab.
4. Group re-renders with the new tab order.
5. Drop outside the group → no change (drag-between-groups is out of scope this tick).

**Visual feedback.**
- Dragged tab: `opacity: 0.5` while dragging (HTML5 default).
- Insertion bar: 2px wide, `hsl(var(--accent-primary))`, height equal to the tab row.
- After drop: tab order updates instantly, no animation.

**Post-conditions.** Per-group tab order persists in `viewSlice.panelTabOrder: Record<groupId, PanelId[]>` to `photoweb:chromePrefs:v1`.

**Edge cases.**
- Drop on the dragged tab's current position → no-op.
- Drop outside the tab row → cancel.
- Newly-visible panel (toggled via Window menu) appears at the END of its group's order, regardless of the stored order — matches Photoshop.

---

### 1.3 Feature spec — Bottom-group collapse chevron + Window menu corrections

**What it does.** Adds a `▴/▾` chevron to the bottom panel group matching top + middle. Enables the disabled Navigator and Info entries in the Window menu. Adds F-key shortcuts to Window menu entries that have Photoshop F-keys (F6 Color, F7 Layers, F8 Info, F5 Brush Presets).

**Photoshop habit preserved.** Lesson body lines 256-281 (CC) / 214-237 (CS6) — collapse main panel column via top-right chevron. F-key shortcuts grounded in `managing-panels-photoshop-cc/images/interface-panels-photoshop-panels-list-1af54ebd.png` (right column shows F7 Layers, F6 Color, F8 Info).

**Invocation.**
- Chevron click toggles bottom group collapse.
- F7 toggles Layers visibility; F6 Color; F8 Info; F5 Brush Presets.

**Pre-conditions.** None.

**Interaction choreography.**
1. User clicks `▴` on bottom group → group collapses to just the tabs row (matching top + middle behavior).
2. Click `▾` → group expands back.
3. User presses `F7` (no modifier): toggles Layers panel visibility via existing `togglePanelVisibility('layers')`. Same for `F6` → Color, `F8` → Info, `F5` → Brush Presets.
4. F-keys suppressed inside `<input>`, `<textarea>`, `[contenteditable]`.

**Visual feedback.** Chevron behavior identical to top + middle. Window menu shows shortcut text on the right of each entry (the existing `chk` helper already supports a shortcut argument).

**Post-conditions.** Bottom-group collapse state persists in `viewSlice.panelGroupCollapsed.bottom`. F-key shortcuts wired in `shortcuts.ts` registry.

**Edge cases.**
- F7 while no panels are visible at all (everything closed) → still toggles `panelVisibility.layers`, which next time the right panel column re-mounts will show Layers.
- F-key while a dialog is open: dialog's a11y hook captures Esc; F-keys fall through and toggle the panel. Could feel surprising. Suppress F-keys when `gs().dialogs.…isOpen` is true (any open modal).

---

### 1.4 Feature spec — `Tab` / `Shift+Tab` panel hide

**What it does.** `Tab` hides every chrome surface (toolbar, options bar, document tab, right panels, status bar — keeping only the menu bar). Press again to restore. `Shift+Tab` hides only the right panel column.

**Photoshop habit preserved.** Lesson body lines 258-265 (CS6): *"Pressing the Tab key on your keyboard once will hide all the panels along the right, as well as the Tools panel on the left of the screen and the Options Bar along the top. Basically, it will hide everything except the Menu Bar. Pressing Tab a second time will bring everything back. To hide only the panels on the right, press Shift+Tab once."*

**Invocation.** `Tab` or `Shift+Tab` while no input/contenteditable element is focused.

**Pre-conditions.** None.

**Interaction choreography.**
1. User presses `Tab`:
   - Sets `chromeHidden: 'all'` in viewSlice.
   - MainLayout reads the flag and zeros out the toolbar / options bar / document tab / right panel / status bar grid rows/cols.
   - Canvas expands to fill the freed space.
2. Press `Tab` again → flag clears, layout reverts.
3. `Shift+Tab` → sets `chromeHidden: 'right'` — only the right panel column collapses.
4. While `chromeHidden !== 'none'`, moving the cursor to the relevant edge does NOT auto-show (Photoshop has a hover-edge reveal, but it's defer-worthy — see §6).
5. Suppress inside `<input>`, `<textarea>`, `[contenteditable]`, and any open dialog.

**Visual feedback.** Layout snaps instantly. No animation.

**Post-conditions.** `chromeHidden` is session-only (does NOT persist) — Photoshop also resets to all-visible on next launch.

**Edge cases.**
- Tab while a tool is mid-drag (e.g., painting a brush stroke): the keydown happens inside the canvas, no focused input — flag fires. The canvas drag continues uninterrupted because canvas is still mounted. The brush dab won't visually move (it's already painted); the layout shift won't tear the in-progress stroke.
- Tab inside a dialog: dialog's focus trap should keep focus inside; Tab cycles focusable elements. We must NOT hijack Tab when a dialog is open.
- The flag is `'all'` / `'right'` / `'none'`. Re-pressing Tab from `'right'` state goes to `'all'`? No — match Photoshop: pressing `Tab` from any hidden state restores all. Pressing `Shift+Tab` toggles right-only.

---

## 2. Out-of-scope-this-tick

- **Drag-tab-between-groups.** Blue-highlight-box behavior, drop-target detection, group merging. Deferred to its own follow-up cluster (call it `01c-panels-dnd`).
- **Drag-tab-to-create-new-group.** Same reason; same follow-up.
- **Secondary icon-only panel column.** Different layout paradigm; out forever unless explicitly scoped.
- **"Reset Essentials" / "Reset Panels"** action. Workspaces excluded per CLAUDE.md §4; a workspace-free "Reset Panels" could exist but adds a Preferences entry — defer.
- **Hover-edge auto-reveal** for hidden panels. Niche and easy to add later; defer.
- **Panel menu options beyond Close / Close Tab Group.** Each panel's own menu items (e.g. Swatches → "Web Hues / Small Thumbnails / etc.") belong in each panel's per-panel cluster.

## 3. Files to edit / create

| Feature | Files |
|---|---|
| 1.1 Tab close (☰ + right-click) | edit [RightPanelDock.tsx](src/components/Panels/RightPanelDock.tsx) (add ☰ icon + menu component + right-click handler). New helper component for the small menu. |
| 1.2 Drag-to-reorder | edit [RightPanelDock.tsx](src/components/Panels/RightPanelDock.tsx) (HTML5 `draggable`, `onDragOver`, `onDrop`); edit [viewSlice.ts](src/store/viewSlice.ts) + [types.ts](src/store/types.ts) (panelTabOrder + setter + persist). |
| 1.3 Bottom-chevron + Window menu fixes | edit [RightPanelDock.tsx](src/components/Panels/RightPanelDock.tsx) (third chevron); edit [MenuBar.tsx](src/components/layout/MenuBar.tsx) (Nav/Info `chk` + F-keys); edit [App.tsx](src/App.tsx) (F5/F6/F7/F8 handler); edit [shortcuts.ts](src/core/shortcuts.ts) (4 entries); edit [viewSlice.ts](src/store/viewSlice.ts) (panelGroupCollapsed.bottom + persist). |
| 1.4 Tab / Shift+Tab | edit [App.tsx](src/App.tsx) (handler); edit [viewSlice.ts](src/store/viewSlice.ts) + [types.ts](src/store/types.ts) (chromeHidden enum); edit [MainLayout.tsx](src/components/layout/MainLayout.tsx) (conditional grid sizing); edit [shortcuts.ts](src/core/shortcuts.ts) (2 entries). |
| Tests | **new** `src/test/01c-panels.test.tsx` |

Estimated ~7 files (1 new, 6 edited). Comfortably under the 40-file stop bar.

## 4. Test cases

- **☰ menu opens with Close + Close Tab Group entries** — render RightPanelDock, click ☰, assert menu items.
- **Close removes only the active panel** — click ☰ → Close, assert `panelVisibility[active]` false, other panels still visible.
- **Close Tab Group hides every panel in the group** — assert every panel in the group has visibility false.
- **Right-click a tab opens the same menu** — fire `contextmenu` on a tab, assert menu visible.
- **Drag-to-reorder updates persistent order** — `dragStart` tab A, `dragOver` position of tab B, `drop`, assert store's `panelTabOrder` reflects swap.
- **Drag drop on same position is no-op.**
- **Bottom group chevron toggles `panelGroupCollapsed.bottom`** — click, assert state.
- **F7 toggles Layers visibility** — `keyDown('F7')`, assert `panelVisibility.layers` flipped.
- **F-keys suppressed inside input** — focus input, `keyDown('F7')`, assert no toggle.
- **Tab keyboard shortcut sets chromeHidden='all'** — `keyDown('Tab')`, assert store.
- **Tab again restores chromeHidden='none'**.
- **Shift+Tab sets chromeHidden='right'**.
- **Window menu Nav/Info now uses chk** — render menu, assert checkmark renders.

## 5. Divergences from Photoshop

1. **No floating-window panels.** Browser apps can't OS-float subtrees; panels stay docked. *Browser constraint.*
2. **Drag-between-groups + drag-create-group deferred** — shipped only drag-within-a-group this tick. *Cluster boundary; will land in a follow-up panels-dnd cluster.*
3. **No secondary icon-only column.** photoweb's right column is wide enough for full tabs; the icon column is a Photoshop-specific space saver. *Layout decision; not adding.*
4. **No "Reset Panels" command.** Workspaces excluded per CLAUDE.md §4 makes the workspace-reset entry inappropriate. A workspace-free reset is possible but deferred. *Scope adjacency.*
5. **No hover-edge auto-reveal when panels are Tab-hidden.** Convenience polish; defer. *Convenience deferred.*
6. **F-key set limited to existing panels.** Photoshop has F9 Actions, F-keys for Brush, Histogram, etc. — those panels don't exist in photoweb yet; F-keys wire up only when their panel exists. *Cluster dependency.*

## 6. Stop conditions specific to this cluster

- Stop if drag-to-reorder requires reshuffling more than RightPanelDock + viewSlice. The DnD logic should be self-contained.
- Stop if Tab/Shift+Tab hide breaks any existing dialog focus-trap behavior. The handler MUST suppress when a dialog is open.
- Stop if the ☰ menu requires a new generic menu component used across the app. Use inline JSX matching the existing LayersPanel context menu pattern.
