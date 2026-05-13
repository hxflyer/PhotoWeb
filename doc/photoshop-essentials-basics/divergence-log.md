# Photoshop divergence log

Append-only record of deliberate departures from Photoshop UX. The /loop appends here at the end of every tick that introduced a divergence; the user appends here when overriding a Photoshop convention during manual work.

Each entry is one departure. Keep entries terse — one paragraph at most.

## Format

```
## YYYY-MM-DD — <cluster-id> — <feature>
**Photoshop behavior:** ...
**Photoweb behavior:** ...
**Rationale:** ... (browser constraint, UX improvement, scope decision, etc.)
```

---

<!-- New entries below. Newest at the bottom. -->

## 2026-05-13 — 01a-interface-shell — Status bar info modes

**Photoshop behavior:** Status bar info-mode menu lists ~12 entries: Adobe Drive, Document Sizes, Document Profile, Document Dimensions, Measurement Scale, Scratch Sizes, Efficiency, Timing, Current Tool, 32-bit Exposure, Save Progress, Smart Objects, Layer Count.
**Photoweb behavior:** 5 entries — Document Sizes, Document Profile, Document Dimensions, Current Tool, Layer Count.
**Rationale:** The other 8 each map to a CLAUDE.md §4 scope exclusion (Adobe ecosystem, color management, Smart Objects, 32-bit float / HDR, save-engine internals). Keep the 5 that remain meaningful for an sRGB browser editor.

## 2026-05-13 — 01a-interface-shell — Document Profile fixed string

**Photoshop behavior:** Status bar Document Profile mode shows the document's working color space (Adobe RGB, ProPhoto, sRGB, etc.).
**Photoweb behavior:** Always displays `sRGB IEC61966-2.1 (8bpc)`.
**Rationale:** sRGB-only per CLAUDE.md §4 (`color_management` excluded). No color-profile UI elsewhere in the app.

## 2026-05-13 — 01a-interface-shell — Resolution fixed at 72 ppi

**Photoshop behavior:** Status bar Document Dimensions mode and the press-and-hold popover show the user-set Resolution from Image > Image Size.
**Photoweb behavior:** Both display `72 pixels/inch` (72 ppi) regardless of document state.
**Rationale:** No Image Size dialog yet — lives in cluster 05a-image-size. When 05a lands, the chrome will read from `state.resolution` instead of the hard-coded constant.

## 2026-05-13 — 01a-interface-shell — Document Tab × close button deferred

**Photoshop behavior:** Tab close `×` triggers File > Close with a save-changes-or-discard prompt.
**Photoweb behavior:** Tab renders without a close button this tick.
**Rationale:** File > Close action isn't wired anywhere yet; the proper save-or-discard prompt lives in cluster 04c-file-save-close. Shipping a half-wired × that ignores dirty state would violate CLAUDE.md §6 "no half-implementations".

## 2026-05-13 — 01a-interface-shell — Color theme picker inside flat Preferences dialog

**Photoshop behavior:** Preferences uses a left-rail category sidebar (General / Interface / File Handling / Performance / Cursors / Transparency & Gamut / Units & Rulers / …) with each category's settings on the right.
**Photoweb behavior:** Preferences is a single flat panel; the new color-theme picker lives in a top "Interface" subsection.
**Rationale:** Adding the category sidebar is an IA-level pass deferred to cluster 02-preferences. The "Interface" label preserves the Photoshop section name so a user looking for the right place can still find it.

## 2026-05-13 — 01a-interface-shell — Pasteboard context menu uses photoweb styling

**Photoshop behavior:** Pasteboard right-click opens a native OS context menu.
**Photoweb behavior:** Opens photoweb's own dark-themed context menu (same component family as LayersPanel right-click).
**Rationale:** Browser constraint — native menu styling can't be themed to match the rest of the dark photoweb UI cross-OS. Using the in-app menu keeps dark/light theme correctness consistent.

## 2026-05-13 — 01b-toolbar — Double-column toolbar omits group separators

**Photoshop behavior:** In single-column mode the toolbar shows thin horizontal separators between tool groups; double-column drops them.
**Photoweb behavior:** Same — separators render in single-column only; double-column packs tools tight without dividers.
**Rationale:** Matching Photoshop's actual double-column screenshot (`interface-tools-photoshop-double-column-toolbar-a03bf319.png`), where Photoshop itself drops the separators.

## 2026-05-13 — 01b-toolbar — Double-column tool pairing flows naturally instead of Photoshop's curated pairs

**Photoshop behavior:** Photoshop's double-column toolbar hand-curates pairings (Move↔Artboard, Marquee↔Frame, etc.).
**Photoweb behavior:** Tools flow two-up in `TOOL_GROUPS` order; whatever index pair results is what renders.
**Rationale:** photoweb omits several Photoshop tools per CLAUDE.md §4 (Artboard, Frame, Rotate View, 3D variants, Slice tools, Content-Aware Move), so Photoshop's exact pairings can't be reproduced. Flow-two-up is the closest non-broken alternative.

## 2026-05-13 — 01b-toolbar — Slide-and-release sub-tool selection deferred

**Photoshop behavior:** Press-and-hold opens the hidden-tools flyout AND lets the user slide-cursor-to-target and release in one gesture.
**Photoweb behavior:** Press-and-hold opens the flyout; user clicks the desired sub-tool in a separate gesture.
**Rationale:** Slide-and-release needs document-level mouseup capture with target-detection. Convenient polish but not load-bearing for the Photoshop muscle-memory contract — the flyout still opens on the press-and-hold gesture; the second click is a small ergonomic delta. Deferred polish.


## 2026-05-13 — 01c-panels — No floating panel windows

**Photoshop behavior:** Drag a panel's tab out of the right column and it becomes a free-floating OS-level window.
**Photoweb behavior:** Panels stay docked in the right column; no float / detach.
**Rationale:** Browsers cannot OS-float arbitrary subtrees. Floating is out forever.

## 2026-05-13 — 01c-panels — Drag-between-groups deferred (drag-within only this tick)

**Photoshop behavior:** Drag a tab into another group's tab row to join it; drop between groups for a horizontal blue bar that creates a new group.
**Photoweb behavior:** Drag-to-reorder works within a group; cross-group drag and drag-to-create-new-group are deferred.
**Rationale:** Drop-target detection across multiple group chrome instances plus the blue-bar-vs-blue-box visual machinery is a substantial subsystem. Shipping it alongside the four other features here would trip the 40-file stop bar. Will land in a follow-up `01c-panels-dnd` cluster.

## 2026-05-13 — 01c-panels — No secondary icon-only panel column

**Photoshop behavior:** A narrow column LEFT of the main panel column shows panels as icon-only; clicking an icon expands the panel temporarily.
**Photoweb behavior:** Single right column for all panels.
**Rationale:** The icon-only column is a space-saver for Photoshop's dense panel ecology. photoweb's panel inventory is smaller and the main column is wide enough for tab labels. Re-evaluate if panel count grows substantially.

## 2026-05-13 — 01c-panels — No "Reset Essentials" / workspace-reset command

**Photoshop behavior:** A "Reset Essentials" menu entry restores the default workspace's panel layout.
**Photoweb behavior:** No reset command.
**Rationale:** Workspaces are scope-excluded per CLAUDE.md §4. A workspace-free "Reset Panels" could exist but adds a Preferences entry; deferred for the same reasons as the Preferences IA pass.

## 2026-05-13 — 01c-panels — Tab/Shift+Tab does not auto-reveal on edge hover

**Photoshop behavior:** While panels are Tab-hidden, hovering the cursor at the screen edge temporarily reveals the panels.
**Photoweb behavior:** Hidden chrome stays hidden until the user presses Tab again.
**Rationale:** Convenience polish; users can press Tab to restore. Deferred.

## 2026-05-13 — 01c-panels — F-key shortcuts limited to existing photoweb panels

**Photoshop behavior:** Window menu has F-key shortcuts for ~10 panels (F5 Brush, F6 Color, F7 Layers, F8 Info, F9 Actions, etc.).
**Photoweb behavior:** Wired F5 Brush Presets, F6 Color, F7 Layers, F8 Info. F9 Actions, F10/F11/F12 etc. not wired because the underlying panels don't exist in photoweb (Actions excluded per scope; others not yet built).
**Rationale:** Bind F-keys only when the destination panel exists. New panels will pick up their own F-keys in their per-panel clusters.

## 2026-05-13 — 01d-screen-modes — No Full-Screen-Mode warning dialog

**Photoshop behavior:** First time entering Full Screen Mode, Photoshop shows a dialog warning "the interface will be hidden — click Full Screen to accept".
**Photoweb behavior:** F immediately enters Full Screen; Esc / F exits.
**Rationale:** Photoshop users who reach for F expect the mode change; the warning is mostly anti-confusion for new users. Adding a one-time dismissible dialog is convenience polish and deferred.

## 2026-05-13 — 01d-screen-modes — No hover-near-edge auto-reveal in Full Screen

**Photoshop behavior:** While in Full Screen Mode, hovering cursor near the LEFT edge reveals the toolbar; near the RIGHT edge reveals the panels.
**Photoweb behavior:** Tab / Shift+Tab still work to toggle chrome while in any screen mode. No hover-edge reveal.
**Rationale:** Convenience polish deferred; users have keyboard fallbacks (F, Esc, Tab, Shift+Tab).

## 2026-05-13 — 01d-screen-modes — No multi-document cycling (Ctrl+Tab / Ctrl+Shift+Tab)

**Photoshop behavior:** In Full Screen Mode, Ctrl+Tab cycles forward through open documents; Ctrl+Shift+Tab cycles backward.
**Photoweb behavior:** Not implemented. Photoweb is single-document per CLAUDE.md §4 (multi_doc_ui excluded).
**Rationale:** Scope.

## 2026-05-13 — 01e-neutral-color-mode — No Share button to neutralise; toggle affects other accents instead

**Photoshop behavior:** Neutral Color Mode primarily removes the blue color from the Share button in the upper right.
**Photoweb behavior:** photoweb has no Share button (CLAUDE.md §4 excludes Creative Cloud), so the toggle instead neutralises the same `--accent-primary` / `--accent-highlight` tokens that drive active tool buttons, active panel tabs, and dialog commit buttons. Color-related surfaces (Color Picker, Gradient Editor, Swatches) don't use these tokens and remain unaffected — matching Photoshop's carve-out.
**Rationale:** Same UI, same label, different blue surfaces affected — adapted to the photoweb chrome inventory.

## 2026-05-13 — 02-preferences — Five categories shipped, not all twelve

**Photoshop behavior:** Preferences sidebar lists General / Interface / Tools / File Handling / Performance / Scratch Disks / Cursors / Transparency & Gamut / Units & Rulers / Plug-ins / Type / 3D.
**Photoweb behavior:** Five categories: General / Interface / Tools / File Handling / Performance.
**Rationale:** photoweb has no settings under the missing seven (browser-managed memory/scratch, no 3D, no plug-ins, etc.). Per-feature clusters will add new categories as their settings land.

## 2026-05-13 — 02-preferences — No Memory Usage, Scratch Disks, Export Clipboard

**Photoshop behavior:** Performance > Memory Usage slider; Performance > Scratch Disks list; General > Export Clipboard.
**Photoweb behavior:** Performance shows only History max size; the rest are absent with a one-line note "Memory usage and scratch disks are managed by the browser."
**Rationale:** Browser environment manages memory and disk; no user-controllable equivalent. Permanent.

## 2026-05-13 — 02-preferences — UI Font Size is a slider, not a discrete dropdown

**Photoshop behavior:** UI Font Size is a Tiny / Small / Medium / Large dropdown.
**Photoweb behavior:** Continuous slider from 80% to 140%.
**Rationale:** Slider was already shipped in 01a; migrating to discrete options would lose precision. Slider behaviour is otherwise functionally equivalent.

## 2026-05-13 — 02-preferences — Show Tool Tips toggle and Highlight Color deferred

**Photoshop behavior:** Tools > Show Tool Tips toggle controls whether hover tooltips appear; Interface > Highlight Color picks Default Gray vs Blue for the selected layer in the Layers panel.
**Photoweb behavior:** Neither is implemented this tick.
**Rationale:** Show Tool Tips requires app-wide gating of HTML `title` attrs (browsers render them natively, can't be CSS-suppressed); deep refactor deferred. Highlight Color is a small Layers-panel CSS change deferred to the layers-panel cluster.
