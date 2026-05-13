# gap-report — 01a-interface-shell

## Lessons reviewed

- `learning-the-photoshop-interface` — chapter index linking out to all 10 sibling lessons in the Photoshop interface chapter (toolbar, panels, workspaces, screen modes, etc.). No new content of its own.
- `getting-know-photoshop-interface` — orientation tour: Document window + canvas + pasteboard, document tab (name @ zoom (mode/bitdepth)), bottom-left zoom + status bar with info menu, Toolbar single/double column, Options Bar, Menu Bar, Panels (groups, Window menu), Search bar (CC), Workspaces.
- `interface` — Photoshop CS4 interface tour: Tools panel (single/double column toggle, hidden-tool flyout), Options Bar, Application Bar (Bridge launch, View Extras, preset zoom-level menu, Hand+Zoom proxies, Rotate View, Arrange Documents, Screen Mode icon), Panels (groups, menu icon), Workspaces, Document window (status bar + click-the-arrow info menu), Application Frame (Mac).
- `interface-cs6` — 4 interface color themes via Preferences > Interface; **`Shift+F2`** cycles darker→lighter, **`Shift+F1`** cycles lighter→darker; pasteboard color set independently via **right-click on the pasteboard** (menu: Default / Black / Dark Gray / Medium Gray / Light Gray / Custom / Select Custom Color…).

This cluster's design intent (per `clusters.json`): audit / build the **document window chrome** — tab, status bar, pasteboard, color theme. Toolbar, panels, screen modes, and Neutral Color Mode each live in their own follow-up clusters.

## Current photoweb coverage

### Layout shell — exists, missing one row
- [src/components/layout/MainLayout.tsx:14-92](src/components/layout/MainLayout.tsx#L14-L92) is a 3-column / 4-row CSS grid: `48px / 1fr / 260px` columns × `24px menu / 30px options / 1fr canvas / 22px status` rows. No row reserved for a document tab above the canvas — Photoshop's tab lives between the Options Bar and the canvas.
- Canvas area background = single CSS variable `hsl(var(--bg-canvas))` at [MainLayout.tsx:66](src/components/layout/MainLayout.tsx#L66). No right-click affordance.

### Status bar — partial
- [src/components/layout/StatusBar.tsx:101-194](src/components/layout/StatusBar.tsx#L101-L194) renders, from left to right: zoom % · doc-info field with toggle dropdown · dimensions `W × H px` · active tool name · cursor coords · dirty indicator · document name.
- The "doc info" dropdown ([StatusBar.tsx:122-156](src/components/layout/StatusBar.tsx#L122-L156)) has only two modes: `Document Sizes` and `Layer Count`. Triggered by left-click toggle, not by a dedicated arrow button.
- **No click-and-hold popup** that shows Width / Height / Channels / Resolution. The Photoshop screenshots `getting-know-photoshop-interface/images/interface-overview-photoshop-status-bar-more-info-9ad721ea.png` and `…-other-info-7fa63529.png` show two distinct interactions on the same status-bar element: (a) **press-and-hold on the info text** → callout box with image stats, (b) **click the small right-pointing arrow** → dropdown of info modes.

### Document tab — missing
- No component renders `filename @ zoom (mode/bitdepth) [×]` anywhere. The document name is shown only on the right side of the status bar at [StatusBar.tsx:189-191](src/components/layout/StatusBar.tsx#L189-L191). Source screenshot: `getting-know-photoshop-interface/images/interface-overview-photoshop-document-window-tab-08cd471e.png`.

### Pasteboard color picker — missing
- The canvas area's background is fixed at `hsl(var(--bg-canvas))`. No right-click handler on the canvas pasteboard. The grep confirms the only right-click context menu in the codebase is on layer rows in [LayersPanel.tsx:212](src/components/Panels/LayersPanel.tsx#L212). Source screenshot: `interface-cs6/images/new-features-interface-new-pasteboard-color-c09b498b.gif`.

### Color theme — missing
- [src/index.css:1-31](src/index.css#L1-L31) defines a single dark palette under `:root`. No data attribute swap (`:root[data-theme="…"]`) and no theme variants.
- [src/components/Dialogs/PreferencesDialog.tsx:73-104](src/components/Dialogs/PreferencesDialog.tsx#L73-L104) is a single flat dialog (History max size, Autosave interval, UI scale). No "Interface" category, no color-theme picker — the Photoshop dialog has a category sidebar (General / Interface / File Handling / Performance / Cursors / Transparency & Gamut / Units & Rulers / …) and shows the four color-theme thumbnails in the Interface category.
- [src/App.tsx:380-462](src/App.tsx#L380-L462) is the global keyboard-shortcut wiring; no `Shift+F1` or `Shift+F2` handler. [src/core/shortcuts.ts](src/core/shortcuts.ts) is the registry rendered into ShortcutsDialog; no theme-cycle entries.
- [src/store/viewSlice.ts](src/store/viewSlice.ts) is the existing source of truth for UI-side preferences; no `colorTheme` or `pasteboardColor` fields.

## Gaps

| # | Gap | Where |
|---|---|---|
| 1 | No document tab — `filename @ zoom% (mode/bitdepth)` is invisible to a Photoshop user landing in photoweb. | Missing component; [MainLayout.tsx](src/components/layout/MainLayout.tsx) needs a row between Options Bar and Canvas. |
| 2 | Status bar's two-line dropdown conflates Photoshop's two separate gestures (press-and-hold popup vs. arrow-button info-mode menu). | [StatusBar.tsx:122-156](src/components/layout/StatusBar.tsx#L122-L156). |
| 3 | Status-bar info modes are limited to `Document Sizes` / `Layer Count`. Photoshop shows ≈12 entries; the in-scope subset for an sRGB browser editor is `Document Sizes`, `Document Profile`, `Document Dimensions`, `Current Tool`, `Layer Count` (5). | Same file. |
| 4 | No press-and-hold dimensions/channels/resolution popup on the status bar. | Same file. |
| 5 | Canvas pasteboard background is a single fixed CSS var with no right-click. | [MainLayout.tsx:66](src/components/layout/MainLayout.tsx#L66) + new context menu component. |
| 6 | No color theme switcher anywhere. | [src/index.css](src/index.css) needs theme-attribute variants, [PreferencesDialog.tsx](src/components/Dialogs/PreferencesDialog.tsx) needs an Interface category, [App.tsx](src/App.tsx) needs `Shift+F1` / `Shift+F2`, [shortcuts.ts](src/core/shortcuts.ts) needs the two cycle entries. |
| 7 | No pasteboard-color persistence. | new key in viewSlice + localStorage. |

## Photoshop-habit mismatches

For each: cite which screenshot grounds the observation.

1. **Document tab content & ordering**: Photoshop tab reads `× <filename>.<ext> @ <zoom>% (<color-mode>/<bitdepth>) *` with the close × on the **left** of the filename, an `*` after the parenthesis only when dirty. Photoweb shows the filename on the **right** of the status bar with a separate `● Unsaved changes` chip; a Photoshop user expects the tab and the `*`. → grounded in `getting-know-photoshop-interface/images/interface-overview-photoshop-document-window-tab-08cd471e.png`.
2. **Click-and-hold gesture**: Photoshop reserves *press-and-hold on the status bar text* (not just the dropdown) for the stats popup with Width / Height / Channels / Resolution. Photoweb instead uses click-toggle to switch info mode. → grounded in `…interface-overview-photoshop-status-bar-more-info-9ad721ea.png` (popup) plus `…-other-info-7fa63529.png` (the *separate* `>` arrow menu).
3. **Info-mode menu trigger**: Photoshop opens the modes list from a small **right-pointing arrow** at the right end of the status-bar info field — a distinct hit target. Photoweb's dropdown opens from anywhere on the info text. → same screenshots.
4. **Pasteboard right-click vocabulary**: Photoshop's menu reads `Default / Black / Dark Gray / Medium Gray / Light Gray / Custom / Select Custom Color…`. The names matter — a Photoshop user looking for "Medium Gray" should not see "Mid Gray" or "Gray 50". → grounded in `interface-cs6/images/new-features-interface-new-pasteboard-color-c09b498b.gif`.
5. **Color theme thumbnails layout**: Photoshop shows **four square thumbnails in a row** under Preferences > Interface > Appearance > Color Theme, with the *darkest on the left* and *lightest on the right*, and a "Color" tag label. → grounded in `interface-cs6/images/new-features-interface-color-theme-thumbnails-3c34397a.gif`.
6. **Color theme keyboard cycle direction**: `Shift+F2` cycles **darker → lighter**, `Shift+F1` **lighter → darker**. Easy to flip by accident. → grounded in `interface-cs6/lesson.md` lines 36-37.
7. **Preferences dialog category sidebar**: Photoshop Preferences uses a left-rail category list (General, Interface, File Handling, Performance, Cursors, Transparency & Gamut, Units & Rulers, …) with a settings pane on the right. Photoweb's current flat single-pane is acceptable for one or two settings but won't scale and isn't where a Photoshop user expects to find color theme. → grounded in `interface-cs6/images/new-features-interface-preferences-interface-e55817d3.gif` (Mac Preferences menu opens dialog with category list visible on the left).

## UI / UX issues (separate from §4)

- Status-bar zoom display is text-only (no scrubby slider, no right-click for preset zoom levels). Out of scope for this cluster (belongs in 03-navigation).
- Pasteboard background uses `--bg-canvas` everywhere; once the pasteboard becomes user-customizable it should NOT share a token with adjacent dialogs/popovers.
- Existing dropdown uses `onMouseDown` (no keyboard support, no focus trap). The new info-mode dropdown should follow the same pattern as [LayersPanel.tsx:179-215](src/components/Panels/LayersPanel.tsx#L179-L215) (Esc closes, outside click closes) for consistency.

## Photoshop divergences worth keeping (no change needed)

- **Single-document model**: photoweb shows only one document at a time per CLAUDE.md §4 (Multi-document UI excluded). The document tab will still render, but tab switching / close-other-tabs is out of scope. A `×` close button on the tab is in scope (closes the only doc, with the usual "Save changes?" prompt).
- **sRGB-only color profile**: photoweb is sRGB end-to-end per CLAUDE.md §4 (color_management excluded). Status-bar `Document Profile` mode therefore always displays `sRGB IEC61966-2.1 (8bpc)` — no profile-picker UI in the dialog. Logged in [divergence-log.md](../divergence-log.md) once implemented.
- **Color-mode/bitdepth in the tab**: photoweb is RGB 8-bit per pixel always, so the tab will read `(RGB/8)` constantly. Considered correct — Photoshop users expect this string in that slot.
- **Application Bar / Application Frame**: out of scope (multi-doc UI). The Application Bar's Zoom-Level preset menu is a *navigation* feature that belongs in cluster 03-navigation; not addressed here.
- **Search bar (CC)**: out of scope per CLAUDE.md §4 ("Help, release notes, FAQ, documentation browser, or product-support features").
- **Workspaces**: out of scope per CLAUDE.md §4.
