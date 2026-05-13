# plan — 01a-interface-shell

Four Feature specs land in this tick. Each one names the Photoshop habit it preserves, lists every alternate invocation path, spells out the gesture choreography, and specifies the simulator tests that pin it. Divergences are concrete and grounded in browser-constraint or CLAUDE.md §4.

---

## 1. Goals

### 1.1 Feature spec — Document Tab

**What it does.** Renders a strip directly above the canvas area showing the document's name, current zoom level, color mode, and bit depth, plus a leading `×` close button and a trailing `*` dirty indicator. Re-creates the Photoshop document tab so a Photoshop user immediately recognizes where they are.

**Photoshop habit preserved.** Tab content reads `× <filename>.<ext> @ <zoom>% (RGB/8) *`. The `×` sits on the left of the filename; the `*` after the `(RGB/8)` parenthesis only when there are unsaved changes. Tab background is darker than the Options Bar above it and the pasteboard below it, so it visually separates them. Screenshot: `getting-know-photoshop-interface/images/interface-overview-photoshop-document-window-tab-08cd471e.png`.

**Invocation.** Always rendered — no toggle, no shortcut. Clicking the `×` triggers `File > Close` (Ctrl/Cmd+W); when the document is dirty, the standard confirm dialog opens.

**Pre-conditions.** A document exists in the store (`useEditorStore` returns `documentName`, `width`, `height`, `zoom`, `isDirty`). When the store is in its zero-document state, the tab still renders with the default `Untitled.png @ 100% (RGB/8)` (Photoshop renders an empty tab strip on the New Document creation flow).

**Note on the `×` close button — deferred.** The Photoshop tab's `×` triggers `File > Close` with a save-changes-or-discard prompt. photoweb has no `File > Close` action wired yet (it lives in cluster `04c-file-save-close`). Rather than ship a half-implementation that ignores dirty state, this tick **renders the tab without the `×`**; the visual difference is small (a leading 12px column missing) and a Photoshop user still recognizes the tab. `04c` will add the `×` plus the proper close-with-prompt flow.

**Interaction choreography.**
1. User opens or creates a document. The tab renders synchronously with the rest of the chrome.
2. User scrolls / pans / zooms. The `@ <zoom>%` token updates live (rounded to nearest integer percent — same as the existing StatusBar zoom display).
3. User edits the document. The `*` after `(RGB/8)` appears the moment `isDirty` flips to true; disappears on save.
4. User hovers over the `×`. Cursor stays as default arrow (Photoshop uses default arrow over chrome; only canvas-area gets the tool cursor). The `×` itself gets a subtle hover background — `hsl(var(--bg-hover))` matching MenuBar entries.
5. User clicks the `×`. The same close path as `File > Close` runs (existing `Ctrl/Cmd+W` action) — confirmation dialog when dirty, immediate close when clean. After close, the tab keeps rendering with the default empty state.

**Visual feedback.**
- Tab strip height: `26px` (between Options Bar `30px` and the existing canvas) — matches Photoshop tab proportions in the source screenshot.
- Tab background: `hsl(var(--bg-header))` (same token as Options Bar) so chrome reads as one unit. Active-tab border-bottom: 1px `hsl(var(--bg-canvas))` so the tab and canvas blend.
- Text color: `hsl(var(--text-main))`.
- `×` is rendered as a leading 12px lucide `X` icon at `text-muted` color, becomes `text-main` on hover.
- Font: 12px, `var(--font-sans)`.

**Post-conditions.** No store state change from rendering. Closing the tab follows `documentSlice.closeDocument()` (existing) and dispatches the existing autosave + history teardown — no new persistence.

**Edge cases.**
- `documentName` containing path separators: show only the basename (e.g. `untitled-1.psd` even if internally stored as `~/Documents/untitled-1.psd`).
- `documentName` long enough to overflow the tab: ellipsize with `text-overflow: ellipsis` after the `×` and before the `@`, preserving the right-hand `(RGB/8) *` so the user always sees the dirty marker.
- Zoom of `0.5` shows as `50%`, zoom of `1` shows as `100%`, zoom of `0.001` shows as `0%` (matching StatusBar rounding semantics).
- Close button clicked while a modal dialog is open: ignored (existing dialog-modality should swallow). No new logic needed.

---

### 1.2 Feature spec — Status Bar info-mode menu + press-and-hold dimensions popup

**What it does.** Splits the current single-dropdown status-bar widget into Photoshop's two distinct gestures: (a) **press-and-hold on the info text** shows a transient stats popover above the field (Width / Height / Channels / Resolution), (b) **click a small right-pointing arrow** opens a stable info-mode menu (5 modes in scope; sRGB-only and Smart-Objects-free trims the Photoshop list of ≈12 down to 5). The visible status text matches the selected mode.

**Photoshop habit preserved.** Two gestures, two outcomes, both terminating at the same status-bar segment. Mode names match Photoshop verbatim: `Document Sizes` / `Document Profile` / `Document Dimensions` / `Current Tool` / `Layer Count`. The `>` arrow is a separate hit target at the right edge of the info text. The press-and-hold popover shows above the text (callout pointing down). Screenshots: `…interface-overview-photoshop-status-bar-40b1ab31.png`, `…interface-overview-photoshop-status-bar-more-info-9ad721ea.png`, `…interface-overview-photoshop-status-bar-other-info-7fa63529.png`.

**Invocation.**
- Press-and-hold (≥150ms `mousedown` without movement) on the info text → popover appears, stays until `mouseup`.
- Click on the trailing `>` arrow → info-mode menu opens; click a mode to apply, click outside or `Esc` to close.

**Pre-conditions.** Always available (no document required — the status bar shows for the empty default state too).

**Interaction choreography.**
1. User moves cursor over the info text — cursor stays as default arrow (no `pointer` cursor; chrome doesn't claim selectability).
2. User presses-and-holds left mouse button on the info text:
   - At `mousedown` start, a 150ms timer arms. If `mouseup` or `mousemove > 4px` fires first, the gesture is treated as a click (which does nothing — the click belongs to the `>` arrow, not the text).
   - After 150ms with no movement: popover renders above the text. Content lines:
     - `Width: <width> pixels`
     - `Height: <height> pixels`
     - `Channels: 3 (RGB Color, 8bpc)`
     - `Resolution: 72 pixels/inch` (sRGB default — fixed because photoweb has no resolution UI)
3. User releases mouse button (any time after the popover appears): popover dismisses with no further action.
4. User clicks the trailing `>` arrow:
   - Menu opens immediately on `mousedown` (Photoshop opens on `mousedown` for popups).
   - Menu items in order: `Document Sizes` · `Document Profile` · `Document Dimensions` · `Current Tool` · `Layer Count`. The active mode has a leading `✓` (lucide `Check` 11px).
   - Hover state on items uses `hsl(var(--bg-hover))`.
5. User clicks an item: status text updates to the new mode's content, menu closes, store updates `statusBarInfoMode`.
6. User presses `Esc` or clicks outside: menu closes without changing mode.

**Visual feedback.**
- Status text matches the chosen mode:
  - `Document Sizes` → `<flatMB>M / <withLayersMB>M`
  - `Document Profile` → `sRGB IEC61966-2.1 (8bpc)`
  - `Document Dimensions` → `<W> px × <H> px (72 ppi)`
  - `Current Tool` → tool label (e.g. `Rectangular Marquee`)
  - `Layer Count` → `<visible>/<total> Layers`
- `>` arrow is the lucide `ChevronRight` rotated 0deg, 10px, color `hsl(var(--text-muted))`, becomes `text-main` on hover.
- Popover background: `hsl(var(--bg-header))`, border `1px solid hsl(var(--border-light))`, padding `6px 10px`, `box-shadow: var(--shadow-menu)`, anchored at the info text's top-left edge and offset −6px upward to feel like a callout.

**Post-conditions.** `statusBarInfoMode` persists in localStorage `photoweb:statusBarInfoMode:v1` (matches existing viewSlice persistence pattern). No history entry — chrome state, not document state.

**Edge cases.**
- Press-and-hold then drag: cancel the timer; do not show the popover; treat as a no-op.
- Open mode menu, then press-and-hold info text: the menu's outside-click handler closes the menu; the press-and-hold gesture begins normally.
- Mode menu open during tool change: tool changes don't close the menu (menu owns focus).
- Existing `Document Sizes / Layer Count` two-mode toggle replaced. Anyone with localStorage previously saving `infoMode: 'layers'` migrates to `'layerCount'`.

---

### 1.3 Feature spec — Pasteboard color (right-click context menu)

**What it does.** Right-click anywhere on the pasteboard (the dark area surrounding the canvas) opens a small context menu of preset gray shades plus a Custom entry. Selection updates the pasteboard background CSS variable. Choice persists.

**Photoshop habit preserved.** Right-click on pasteboard → menu with exactly these labels in this order: `Default`, `Black`, `Dark Gray`, `Medium Gray`, `Light Gray`, `Custom`, divider, `Select Custom Color…`. The "Custom" entry shows the last user-chosen custom color and is bullet-checked when active; the trailing `Select Custom Color…` opens the existing ColorPickerDialog. Screenshot: `interface-cs6/images/new-features-interface-new-pasteboard-color-c09b498b.gif`.

**Invocation.** Right-click (`contextmenu` event) on the pasteboard area. Not triggered from inside the document area itself — only the surrounding pasteboard.

**Pre-conditions.** None.

**Interaction choreography.**
1. User moves cursor over pasteboard. Cursor: default arrow.
2. User right-clicks (or `Ctrl-click` on macOS). Browser's default context menu is suppressed (`preventDefault`).
3. Custom menu opens at cursor position. The current pasteboard color has a leading `✓`. Menu width: `180px`, item height: `22px`.
4. User hovers over an item: row highlight `hsl(var(--accent-primary))` (matches Photoshop's blue selection highlight), text turns white.
5. User clicks a preset (`Default` / `Black` / `Dark Gray` / `Medium Gray` / `Light Gray` / `Custom`): pasteboard background updates immediately, menu closes, choice persists in localStorage.
6. User clicks `Select Custom Color…`: menu closes, existing ColorPickerDialog opens preloaded with the current pasteboard color. On commit, sets pasteboard to that color and stores it as the user's `Custom` slot. On cancel, no change.
7. User presses `Esc` or clicks outside: menu closes without change.

**Visual feedback.**
- Menu uses the same visual style as the existing LayersPanel context menu: dark background, light border, drop shadow `var(--shadow-menu)`.
- Pasteboard background changes are instant (CSS variable swap — `document.documentElement.style.setProperty('--bg-canvas', '…')`). No animation.

**Post-conditions.** `pasteboardColor: 'default' | 'black' | 'dark-gray' | 'medium-gray' | 'light-gray' | 'custom'` and `pasteboardCustomColor: '#RRGGBB'` persist in localStorage `photoweb:pasteboard:v1`. App boot reads them and applies on mount before first paint.

**Edge cases.**
- Right-click on the canvas pixels (inside the document area, not the pasteboard): existing tool right-click handlers (e.g. context menus on shapes) take precedence; the pasteboard menu only fires when the event target is the pasteboard element.
- Right-click while a dialog is open: ignored (dialog modality).
- ColorPickerDialog cancel: pasteboard reverts to whatever was set before the dialog opened (no premature commit).
- LocalStorage unavailable (private mode): in-memory only; menu still works, choice doesn't persist.

---

### 1.4 Feature spec — Color theme (4 grays, Shift+F1/F2 cycle, Preferences > Interface)

**What it does.** Adds 4 interface color themes (`darkest`, `dark`, `light`, `lightest`) matching Photoshop's gray ladder. User picks via Preferences > Interface > Color Theme (4 thumbnail buttons) or via `Shift+F2` (cycle darker→lighter) / `Shift+F1` (cycle lighter→darker). Theme persists.

**Photoshop habit preserved.** Four thumbnails in a row in the Preferences > Interface > Appearance section, darkest on the left. `Shift+F2` cycles forward (toward lighter), `Shift+F1` backward (toward darker). Screenshot: `interface-cs6/images/new-features-interface-color-theme-thumbnails-3c34397a.gif` (Preferences sidebar with Interface selected, four square thumbnails labeled "Color Theme"). Cycle direction grounded in `interface-cs6/lesson.md:36-37`.

**Invocation.**
1. Preferences > Interface > Color Theme thumbnail click.
2. `Shift+F2` (cycle forward) / `Shift+F1` (cycle backward) from anywhere when no input/textarea is focused.
3. Both also listed in the ShortcutsDialog under group "View" with action ids `view.cycleThemeForward` and `view.cycleThemeBackward`.

**Pre-conditions.** None.

**Interaction choreography.**
1. User opens Preferences (Ctrl/Cmd+K). Existing dialog renders. A new section header "Interface" appears at the top of the form area, before "History max size". Below it: row of four equal-width thumbnail buttons:
   - Each thumbnail is `40 × 28` px, filled with that theme's `--bg-panel` color, bordered `hsl(var(--border-mid))`.
   - The currently active theme's thumbnail has a 2px `hsl(var(--accent-highlight))` outline.
2. User clicks a thumbnail. Outline jumps to the new thumbnail. The interface immediately re-themes (CSS vars swap on `:root`). No "Save" required — preference applies instantly (Photoshop behavior).
3. User closes the dialog. Theme persists.
4. User presses `Shift+F2` from the main canvas (no input focused): theme cycles to the next-lighter. `Shift+F1` cycles to the next-darker. Cycle wraps `lightest → darkest → dark → light → lightest`.
5. Shortcut suppressed inside any `<input>`, `<textarea>`, or `[contenteditable]` element (matching existing keyboard guard pattern in App.tsx).

**Visual feedback.**
- CSS variable swap happens on `document.documentElement` via `data-theme="darkest|dark|light|lightest"` attribute. The four sets of variables live in `src/index.css`. Components consuming `hsl(var(--bg-*))` re-render automatically (CSS-level theming, no React subscription required).
- ShortcutsDialog gains two entries under "View": `Cycle interface theme (lighter) — ⇧F2` and `Cycle interface theme (darker) — ⇧F1`.

**Post-conditions.** `colorTheme: 'darkest' | 'dark' | 'light' | 'lightest'` persists in localStorage `photoweb:colorTheme:v1`. Read on mount; default `dark` (matches Photoshop default and current photoweb appearance).

**Edge cases.**
- `F1` and `F2` alone (no Shift) must not trigger the cycle. The handler asserts `e.shiftKey && (e.key === 'F1' || e.key === 'F2')`. Plain F1 in many browsers opens the browser's help — that's the browser's concern; we don't override it.
- Shift+F2 with Cmd/Ctrl held: ignore (don't cycle); we don't want to fight system-level shortcuts.
- The four themes use **lightness-only** changes to the existing palette tokens (preserve hue and saturation). This keeps the photoweb palette consistent with Photoshop's grayscale aesthetic and avoids re-tuning every accent color per theme.
- The `light` and `lightest` themes need legible text — the same `--text-main` (`0 0% 85%`) becomes hard to read on a near-white panel. Per theme, `--text-main` and `--text-muted` flip to dark values; `--accent-*` keeps its blue.

---

## 2. Out-of-scope-this-tick

- **Document Tab `×` close button.** photoweb has no `File > Close` action yet; the proper close-with-dirty-prompt flow lives in cluster `04c-file-save-close`. This tick renders the tab without the `×`.
- **Preferences dialog category-sidebar restructure** (General / Interface / File Handling / Performance / Cursors / Transparency & Gamut / Units & Rulers). The current dialog is flat; adding a left-rail is a significant IA change that deserves its own pass. *Defer to cluster 02-preferences*. For this tick, the color-theme picker lives inside an unlabeled "Interface" subsection of the flat dialog.
- **Tabbed multi-document UI** (multiple tabs, tab reorder, tab close-other-tabs). CLAUDE.md §4 keeps one document at a time.
- **Status-bar zoom field scrubby slider** (Ctrl-drag to scrub zoom). Belongs in cluster 03-navigation.
- **Photoshop's Application Bar** (Bridge launcher, View Extras, preset Zoom Level menu, Hand+Zoom proxies, Rotate View, Arrange Documents, Screen Mode icon). All out of scope (Bridge, Rotate View, Arrange Documents) or belong elsewhere (Zoom Level → cluster 03; Screen Mode → cluster 01d).
- **Search bar (CC)**. CLAUDE.md §4 excludes "help, release notes, FAQ, documentation browser, or product-support features".
- **Workspaces**. CLAUDE.md §4 excludes.
- **Document Profile picker**. sRGB-only per CLAUDE.md §4. The status bar's `Document Profile` mode shows the fixed string `sRGB IEC61966-2.1 (8bpc)`.
- **Photoshop status-bar info modes not in scope**: `Adobe Drive`, `Measurement Scale`, `Scratch Sizes`, `Efficiency`, `Timing`, `32-bit Exposure`, `Save Progress`, `Smart Objects`. Each maps to an excluded feature in CLAUDE.md §4. 5 of 12 Photoshop modes implemented.
- **Custom-color advanced picker for color theme**. Themes are fixed at 4 presets, not user-defined.

## 3. Files to edit / files to create

Feature → files:

| Feature | Files |
|---|---|
| 1.1 Document Tab | **new** `src/components/layout/DocumentTab.tsx`; edit `src/components/layout/MainLayout.tsx` (add row); edit `src/App.tsx` (wire `<DocumentTab />` into MainLayout slot) |
| 1.2 Status Bar info menu + hold-popover | edit `src/components/layout/StatusBar.tsx`; edit `src/store/viewSlice.ts` (add `statusBarInfoMode` + setter + persist) |
| 1.3 Pasteboard color picker | **new** `src/components/layout/PasteboardContextMenu.tsx`; edit `src/components/layout/MainLayout.tsx` (attach `onContextMenu` on canvas-area wrapper); edit `src/store/viewSlice.ts` (add `pasteboardColor` + setter + persist); edit `src/App.tsx` (apply theme on mount) |
| 1.4 Color theme | edit `src/index.css` (add `:root[data-theme="…"]` variants and reorganize current `:root` palette as the `dark` variant); edit `src/components/Dialogs/PreferencesDialog.tsx` (add Interface section with 4 thumbnails); edit `src/store/viewSlice.ts` (add `colorTheme` + setter + persist); edit `src/App.tsx` (Shift+F1/F2 handler + apply theme on mount); edit `src/core/shortcuts.ts` (two new entries) |
| Tests | **new** `src/test/01a-interface-shell.test.tsx` |

Total estimated diffs: ~12 files (3 new, 9 edited). Under the 40-file stop-bar threshold.

## 4. Test cases

All simulator-driven via `src/test/simulator.ts` + `@testing-library/react`. Each test name reads like a user action.

**Document Tab**
- `renders tab with filename @ zoom% (RGB/8) after opening a document` — sets store doc, asserts tab text.
- `tab × button closes the document via File > Close confirmation flow` — `runScript([click on close-button])`, asserts the close dialog opens.
- `tab shows trailing * only when isDirty is true` — set `isDirty` true/false, assert presence/absence of `*`.
- `tab zoom token updates live when zoom changes` — set zoom 0.5 then 1.0, assert `25%` then `100%`.

**Status Bar info menu + popover**
- `pressing and holding the info text for 200ms shows the dimensions popover` — `mouseDown`, wait 200ms, assert popover content `Width: … Height: …`.
- `releasing the mouse dismisses the popover` — same, then `mouseUp`, assert popover removed.
- `clicking the > arrow opens the mode menu with 5 entries in correct order` — `click(arrow)`, assert menu items list.
- `selecting "Document Dimensions" updates the status text to "<W> px × <H> px (72 ppi)"` — `click(item)`, assert text.
- `pressing Esc with the mode menu open closes it without changing mode` — `keyDown('Escape')`, assert menu gone, mode unchanged.
- `pressing and holding then moving cancels the popover` — `mouseDown`, `mouseMove(10,10)`, wait 200ms, assert no popover.

**Pasteboard color picker**
- `right-clicking the pasteboard opens the menu with 6 items + Select Custom Color…` — `runScript([{type:'contextmenu', target: pasteboard}])`, assert all labels.
- `selecting "Medium Gray" updates the canvas background and persists to localStorage` — click, assert `--bg-canvas` CSS var, assert localStorage.
- `clicking "Select Custom Color…" opens the ColorPickerDialog preloaded with current color` — click, assert dialog open with correct color.
- `right-clicking inside the document area does NOT open the pasteboard menu` — contextmenu on canvas, assert no pasteboard menu.
- `pressing Esc closes the menu without changing the color` — open, Esc, assert closed and color unchanged.

**Color theme**
- `Shift+F2 cycles theme darker→lighter and updates :root[data-theme]` — `keyDown('F2', {shift:true})`, assert `document.documentElement.dataset.theme` increments through the cycle.
- `Shift+F1 cycles theme lighter→darker` — opposite.
- `pressing Shift+F2 inside an input field does NOT change theme` — focus input, key, assert unchanged.
- `clicking a thumbnail in Preferences applies the theme immediately and persists` — open prefs, click 'lightest' thumbnail, assert theme attribute + localStorage.
- `theme persists across simulated reload` — set theme, re-mount the App, assert theme attribute matches.

## 5. Divergences from Photoshop

Each divergence is appended to [divergence-log.md](../divergence-log.md). Form: *Photoshop does X; photoweb does Y because Z*.

1. **Status-bar mode list trimmed from ≈12 to 5.** Photoshop shows Adobe Drive / Document Sizes / Document Profile / Document Dimensions / Measurement Scale / Scratch Sizes / Efficiency / Timing / Current Tool / 32-bit Exposure / Save Progress / Smart Objects / Layer Count; photoweb shows Document Sizes / Document Profile / Document Dimensions / Current Tool / Layer Count because the other 8 map to scope-excluded features in CLAUDE.md §4 (Adobe ecosystem, color management, Smart Objects, etc.). *Browser / scope constraint.*

2. **Document Profile mode shows a fixed string `sRGB IEC61966-2.1 (8bpc)`.** Photoshop allows multiple working color spaces; photoweb is sRGB-only per CLAUDE.md §4 (`color_management` excluded). *Scope constraint.*

3. **Resolution fixed at 72 ppi in Document Dimensions / hold-popover.** Photoshop's Image Size dialog edits resolution; photoweb has no resolution UI yet (lives in cluster 05a-image-size). For now the chrome reports the default 72 ppi. *Cluster dependency — will become live once 05a lands.*

4. **Status-bar info-mode menu opens on `mousedown` (not `click`).** Photoshop opens its menu on `mousedown`; web defaults usually wait for `click`. Matching Photoshop's mousedown feel preserves the gesture rhythm. *Habit preserved, not a divergence — noted for testing clarity.*

5. **Document Tab close `×` triggers the existing File > Close path with confirm dialog.** Photoshop closes the tab the same way; photoweb's single-document model means the tab persists in empty state after close (Photoshop would show the Home Screen — excluded here). *Scope constraint (Home Screen out per CLAUDE.md §4).*

6. **Color theme picker is inside a flat Preferences dialog, not behind a category sidebar.** Photoshop has a category sidebar (General / Interface / …); photoweb's Preferences dialog is currently flat. Adding the sidebar is a larger IA pass deferred to 02-preferences. *Cluster boundary — same name, same location semantics.*

7. **Pasteboard color picker uses photoweb's existing context-menu styling, not a native OS menu.** Photoshop uses native OS menu styling for pasteboard right-click; photoweb uses its own context-menu component for consistency with the existing LayersPanel right-click and to keep dark-theme correctness across OS. *Browser constraint.*

## 6. Stop conditions specific to this cluster

In addition to the global §7 stop bar:
- **Stop if the Preferences dialog needs more than one new section.** That signals creep into the Preferences IA restructure (deferred). Add only an "Interface" subsection with the color-theme picker; everything else stays as-is.
- **Stop if the press-and-hold popover requires reworking event-handling across more than one component** (StatusBar + parent). Self-contained mouse-down timer inside StatusBar is the bar; if browser semantics force more, write HUMAN-REVIEW.md proposing a small follow-up cluster.
- **Stop if the four theme palettes break readability on any non-trivial existing component.** If `light`/`lightest` themes need per-component overrides beyond the `--text-*` flips listed in §1.4, that's a sign the palette needs design work; defer the lighter themes and ship just `darkest`/`dark` with HUMAN-REVIEW.md.
