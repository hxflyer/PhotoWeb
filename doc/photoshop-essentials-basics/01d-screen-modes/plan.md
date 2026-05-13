# plan — 01d-screen-modes

One Feature spec — Screen Modes — with four invocation paths (F / Shift+F, View > Screen Mode menu, toolbar icon, Esc-exit).

---

## 1. Goals

### 1.1 Feature spec — Three Screen Modes with menu + toolbar + keyboard parity

**What it does.** Adds `viewSlice.screenMode: 'standard' | 'full-with-menu' | 'full'`. MainLayout computes chrome visibility from `screenMode` + the existing `chromeHidden` (from 01c). Four ways to switch modes: `F` cycles forward, `Shift+F` cycles backward, View > Screen Mode menu items, click-and-hold the Screen Mode icon at the bottom of the toolbar. `Esc` exits Full Screen back to Standard.

**Photoshop habit preserved.** Exact mode names (`Standard Screen Mode` / `Full Screen Mode With Menu Bar` / `Full Screen Mode`); F shortcut shared by all three entries (cycling target); toolbar icon at the bottom; View > Screen Mode submenu with `✓` on active; toolbar flyout with `■` on active; Esc exits Full Screen. Screenshots: `interface-screen-modes-photoshop-screenmodes-viewmenu-21f7c3ea.png`, `…toolbarmenu-fc09ce51.png`.

**Invocation.**
1. Press `F` (no modifiers) — cycles Standard → With-Menu-Bar → Full → Standard.
2. Press `Shift+F` — cycles backward.
3. View > Screen Mode > [pick one] — direct mode switch.
4. Click-and-hold the Screen Mode toolbar icon → flyout → pick one.
5. Press `Esc` while in Full Screen Mode → returns to Standard.

**Pre-conditions.** None. Suppress `F`/`Esc` inside `<input>`/`<textarea>`/contenteditable and when any modal dialog is open (same guard pattern used by other keyboard handlers).

**Interaction choreography.**

Chrome visibility per mode:
| Surface | Standard | Full With Menu | Full |
|---|---|---|---|
| Menu Bar | ✓ | ✓ | ✗ |
| Options Bar | ✓ | ✓ | ✗ |
| Toolbar | ✓ | ✓ | ✗ |
| Right panels | ✓ | ✓ | ✗ |
| Document tab | ✓ | ✗ | ✗ |
| Status bar | ✓ | ✗ | ✗ |
| Canvas / pasteboard | ✓ | ✓ (expanded) | ✓ (full-screen) |

Layout snaps instantly on mode change. `chromeHidden` (from 01c) still applies on top — pressing `Tab` from any screen mode toggles `chromeHidden = 'all'`; restoring brings back whatever the screen mode would otherwise show.

**Visual feedback.**
- View > Screen Mode submenu: `✓` next to the active mode name; `F` shortcut text on the right of each entry.
- Toolbar Screen Mode flyout: each entry shows the mode's icon (lucide `Square` for Standard, `Minimize2` / `Maximize2` analogs as close as available) + label + `F` shortcut; `■` (small filled square) next to the active mode.
- Layout snap is instant. No animation.

**Post-conditions.** `screenMode` persists to `photoweb:chromePrefs:v1`. (Photoshop persists too — restart picks up the last mode.)

**Edge cases.**
- `F` while a text field is focused: ignored (don't fight typing).
- `F` while a dialog is open: ignored.
- `Esc` while in Standard Screen Mode: pass through (other Esc handlers, e.g. closing menus, take precedence).
- `Esc` while in Full Screen Mode AND a dialog is open: dialog's Esc handler fires first; the screen-mode Esc handler must check `anyDialog` and back off.
- `Tab` (chromeHidden = 'all') while in Full Screen Mode: extra-hide is fine — already-hidden surfaces stay hidden; menu bar (which is visible in Standard but already hidden in Full) stays hidden.

---

## 2. Out-of-scope-this-tick

- **Full-Screen warning dialog** ("the interface will be hidden — click Full Screen to accept"). photoweb users get keyboard `F` muscle memory; the warning is mostly for first-time-clicking-the-icon. Defer.
- **Hover-near-edge auto-reveal** in Full Screen Mode (toolbar appears when cursor near left edge, panels when near right). Convenience polish. Defer.
- **Multi-document cycling** (Ctrl+Tab / Ctrl+Shift+Tab). Multi-doc excluded per CLAUDE.md §4.

## 3. Files to edit / create

| Concern | Files |
|---|---|
| Store | edit [src/store/types.ts](src/store/types.ts) (`ScreenMode` type + `screenMode`/`setScreenMode`/`cycleScreenMode` actions); edit [src/store/viewSlice.ts](src/store/viewSlice.ts). |
| Layout | edit [src/components/layout/MainLayout.tsx](src/components/layout/MainLayout.tsx) (compute visibility from screenMode + chromeHidden). |
| Menu | edit [src/components/layout/MenuBar.tsx](src/components/layout/MenuBar.tsx) (add View > Screen Mode submenu). |
| Toolbar | edit [src/components/Panels/Toolbar.tsx](src/components/Panels/Toolbar.tsx) (Screen Mode icon + flyout at bottom). |
| Keyboard | edit [src/App.tsx](src/App.tsx) (replace module-level cycleScreenMode with store call; add Esc handler). |
| Shortcuts | edit [src/core/shortcuts.ts](src/core/shortcuts.ts) (F + Shift+F entries). |
| Tests | **new** `src/test/01d-screen-modes.test.tsx`. |

Estimated 7 files (1 new). Under the 40-file stop bar.

## 4. Test cases

- `F` cycles screenMode forward (Standard → with-menu → full → Standard).
- `Shift+F` cycles backward (Standard → full → with-menu → Standard).
- `Esc` in Full Screen Mode returns to Standard.
- `Esc` in Standard Screen Mode does NOT change screenMode (other Esc handlers may act).
- View > Screen Mode submenu items set the mode directly.
- Toolbar Screen Mode flyout items set the mode directly.
- F suppressed inside `<input>` and when a dialog is open.
- `screenMode` persists to `photoweb:chromePrefs:v1`.
- Going to Full Screen hides menu bar in MainLayout (grid row collapses to 0).
- Going to Full Screen With Menu Bar hides ONLY doc tab + status bar; menu bar / toolbar / options bar / right panels stay visible.

## 5. Divergences from Photoshop

1. **No Full-Screen warning dialog this tick.** F immediately enters Full Screen; Esc exits. Browser shortcut friction is already low — and a Photoshop user pressing F expects the mode to change. *Convenience polish deferred.*
2. **No hover-near-edge auto-reveal** while in Full Screen Mode. Tab still works to toggle chrome. *Convenience polish deferred.*
3. **No multi-document cycling** shortcuts. *Scope (multi-doc excluded).*

## 6. Stop conditions specific to this cluster

- Stop if MainLayout's visibility logic for `screenMode × chromeHidden` matrix gets more than ~10 conditionals. Two boolean axes × 3 modes = 6 cells; a simple precedence table is fine, more than that means re-think.
- Stop if the Esc handler conflicts with existing dialog / menu Esc handlers. Ours runs only when no dialog is open AND screenMode is `'full'`.
