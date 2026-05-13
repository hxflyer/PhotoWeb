# plan — 02-preferences

Two Feature specs. The first is the long-deferred Preferences IA restructure.

---

## 1. Goals

### 1.1 Feature spec — Preferences dialog with category sidebar

**What it does.** Re-lays the Preferences dialog as a left-rail of categories + a right content pane. Categories: General, Interface, Tools, File Handling, Performance. Selecting a category swaps the right pane. Existing rows move into their Photoshop-canonical categories. Cancel / Save buttons stay at the bottom.

**Photoshop habit preserved.** Left-rail with category names exactly as Photoshop spells them. Content pane shows the selected category's rows. Grounded in `essential-photoshop-preferences-beginners/images/getting-started-preferences-photoshop-preferences-dialog-box-588b210e.png`. The five categories chosen are the ones that have any photoweb-applicable settings today.

**Invocation.** `Ctrl/Cmd+K` (existing). Edit > Preferences (existing menu item).

**Pre-conditions.** None.

**Interaction choreography.**
1. User opens Preferences. Dialog renders with sidebar showing 5 categories; **General** is the default selected category (matches Photoshop). The previously-selected category from the user's last session isn't restored (Photoshop also resets to General each open).
2. User clicks **Interface** in the sidebar. Sidebar highlights it; right pane swaps to the Interface fields (Color Theme thumbnails row, Neutral Color Mode checkbox, UI Font Size slider).
3. User clicks **Tools**. Right pane shows: `Use Shift Key for Tool Switch` checkbox.
4. User clicks **File Handling**. Right pane shows: Autosave interval (seconds).
5. User clicks **Performance**. Right pane shows: History max size.
6. User clicks **General**. Pane shows: an "empty for now" placeholder note (no General settings in scope for this tick — future image-interpolation default lives here).
7. User clicks Cancel → all unsaved changes from commit-on-Save fields are discarded; live-applied changes (Color Theme, Neutral Color Mode, useShiftForToolSwitch) remain because they're applied live.
8. User clicks Save → commit-on-Save fields are persisted; dialog closes.

**Visual feedback.**
- Sidebar: 120px wide column on the left, dark background, each category an item with hover state and selected state. Selected item uses `--accent-primary` background.
- Content pane: existing dialog width minus sidebar; rows match current row styling.
- Dialog overall min-width grows from 380px to ~520px to fit sidebar + content.

**Post-conditions.** No state added for "currently-selected category" beyond local component state. The toggle states (useShiftForToolSwitch, color theme, neutral color mode) persist as before.

**Edge cases.**
- Esc closes dialog (existing useDialogA11y handles this).
- Sidebar keyboard navigation: Up/Down arrow to move between categories. Existing focus trap accepts this.
- Save clicked from inside any category commits everything (not just the visible category).

---

### 1.2 Feature spec — Use Shift Key for Tool Switch

**What it does.** Adds a `useShiftForToolSwitch: boolean` (default true) to viewSlice and a checkbox under Preferences > Tools. When ON (default), tool letter shortcuts require Shift to cycle through sub-tools (M → Rectangular Marquee, Shift+M → Elliptical Marquee). When OFF, pressing the letter alone cycles through the sub-tools.

**Photoshop habit preserved.** Default ON; exact label `Use Shift Key for Tool Switch`; behavior matches Photoshop CC's documented effect. Grounded in lesson body lines 160-172.

**Invocation.** Preferences > Tools > checkbox.

**Pre-conditions.** None.

**Interaction choreography.**
1. User opens Preferences > Tools, sees the checkbox at the top of the pane (the only setting in this category for now).
2. With it checked (default): pressing `M` selects the displayed Marquee tool, but if Marquee is already active, M does NOTHING (or re-selects, same effect). Pressing `Shift+M` cycles to the next Marquee sub-tool.
3. User unchecks the box. From now on, pressing `M` selects the displayed Marquee tool — and if Marquee is already active, M cycles to the next sub-tool.

**Visual feedback.** Standard checkbox; live-apply (no Save click required for the new keyboard behavior to take effect).

**Post-conditions.** `useShiftForToolSwitch: boolean` persisted to `photoweb:chromePrefs:v1`.

**Edge cases.**
- Tool groups with no subs (Move, Crop, Eyedropper, etc.): pressing the letter always activates the tool; the toggle has no effect.
- Dialog open with the toggle being flipped: the App-level keydown handler reads from store directly each fire, so the change applies immediately.

---

## 2. Out-of-scope-this-tick

- **Show Tool Tips** — toggling browser's `title` attr rendering universally is a deep refactor. Defer.
- **Highlight Color (Default Gray / Blue)** for active layer in Layers panel. Defer.
- **Image Interpolation default** preference — lives more naturally in cluster 05a-image-size with the Image Size dialog. Defer to 05a.
- **Recent File List Contains** — no recent-files panel exists; home/start screen excluded per CLAUDE.md §4. Defer permanently.
- **Memory Usage / Scratch Disks** — browser-managed. Permanent divergence.
- **Export Clipboard** — browser-managed. Permanent divergence.
- **Background save progress indicator** in document tab + status bar — saves are short and async in photoweb. Defer.

## 3. Files to edit / create

| Concern | Files |
|---|---|
| Store | edit [src/store/types.ts](src/store/types.ts) (`useShiftForToolSwitch: boolean` + setter); edit [src/store/viewSlice.ts](src/store/viewSlice.ts) (initial + persist). |
| UI | rewrite [src/components/Dialogs/PreferencesDialog.tsx](src/components/Dialogs/PreferencesDialog.tsx) (category sidebar + content pane; redistribute rows). |
| Keyboard | edit [src/App.tsx](src/App.tsx) (tool-cycle handler reads `useShiftForToolSwitch` from store and either requires Shift or treats plain letter as cycle). |
| Tests | **new** `src/test/02-preferences.test.tsx`. |

4 files (1 new). Far under the 40-file stop bar.

## 4. Test cases

- Opening Preferences renders the category sidebar with 5 categories and the General pane visible.
- Clicking Interface in the sidebar reveals the existing color-theme thumbnails + Neutral Color Mode + UI Font Size rows.
- Clicking Tools reveals the new Use Shift Key for Tool Switch checkbox.
- Clicking File Handling reveals the autosave interval input.
- Clicking Performance reveals the history max size input.
- `setUseShiftForToolSwitch(false)` persists to `photoweb:chromePrefs:v1`.
- With `useShiftForToolSwitch: false`, pressing `M` while a marquee tool is active cycles to the next marquee sub-tool (verified via the App-level keyboard cycle).
- With `useShiftForToolSwitch: true` (default), pressing `M` while a marquee tool is active does NOT cycle; `Shift+M` does.

## 5. Divergences from Photoshop

1. **5 categories shipped, not all 12.** Photoshop has General / Interface / Tools / File Handling / Performance / Scratch Disks / Cursors / Transparency & Gamut / Units & Rulers / Plug-ins / Type / 3D. Our 5 cover what photoweb actually exposes. Future per-feature clusters add additional categories as their settings land. *Scope.*
2. **Memory Usage and Scratch Disks absent.** Browser-managed. *Permanent.*
3. **Export Clipboard absent.** *Permanent.*
4. **UI Font Size is a continuous slider, not a Tiny/Small/Medium/Large dropdown.** Slider already shipped (01a); migrating to discrete options would lose precision. *Defer migration.*
5. **Show Tool Tips toggle absent this tick.** *Convenience polish deferred.*
6. **Highlight Color absent this tick.** *Convenience polish deferred.*

## 6. Stop conditions specific to this cluster

- Stop if the sidebar pattern requires more than ~100 new lines of layout JSX. The simple flex-row of `<aside>{categories.map(...)}</aside><section>{rows[selected]}</section>` is the bar.
- Stop if `useShiftForToolSwitch=false` breaks any existing tool-letter test. The App.tsx tool-cycle handler is touched by many integration tests; we expect zero regressions.
