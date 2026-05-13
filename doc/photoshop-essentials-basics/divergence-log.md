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

## 2026-05-13 — 03-navigation — Ctrl+wheel keeps zooming (in addition to new Alt+wheel)

**Photoshop behavior:** Alt/Option + mouse-wheel zooms (anchored at cursor); plain wheel pans; Ctrl/Cmd + wheel pans horizontally.
**Photoweb behavior:** Alt+wheel zooms (Photoshop habit), AND Ctrl+wheel also zooms (legacy photoweb shortcut kept for backward compatibility). Plain wheel still pans. Ctrl+wheel-as-horizontal-pan is not implemented.
**Rationale:** The existing Ctrl+wheel = zoom binding is in users' muscle memory and conflicts with the browser's native Ctrl+wheel page-zoom. Reclaiming Ctrl+wheel for horizontal pan would either fight the browser (preventDefault works inside the canvas only) or break the muscle memory. Both bindings work, so the Alt+wheel Photoshop habit is bridged without breaking the legacy one.

## 2026-05-13 — 03-navigation — No Bird's Eye View, Rotate View Tool, Overscroll, Navigator panel

**Photoshop behavior:** Hold H + click on canvas opens Bird's Eye View; Rotate View Tool (R) rotates the canvas display; Overscroll preference allows scrolling past image bounds; Navigator panel shows the current viewport rectangle on a thumbnail.
**Photoweb behavior:** None of these.
**Rationale:** All four are listed under `nav_extras` in CLAUDE.md §4. Permanent exclusion.

## 2026-05-13 — 03-navigation — No Flick Panning, Continuous Zoom, drag-rect zoom

**Photoshop behavior:** Releasing Hand Tool mid-drag flicks the image with inertia; press-and-hold Zoom Tool button to keep zooming continuously; with Scrubby Zoom off, dragging a rect with Zoom Tool zooms to fit the rect.
**Photoweb behavior:** Hand Tool stops on release; Zoom Tool click is discrete; no drag-rect.
**Rationale:** All three are convenience polish; the core Zoom Tool / Hand Tool interactions cover the common cases. Defer.

## 2026-05-13 — 03-navigation — No zoom-preset snapping on Cmd+/-

**Photoshop behavior:** Cmd+/- snaps zoom to a preset ladder (25 / 33.3 / 50 / 66.7 / 100 / 200 / 400 / 800 …) for the sharpest possible view at each step.
**Photoweb behavior:** Cmd+/- multiplies / divides by a constant factor (1.25).
**Rationale:** Small follow-up. Deferred.

## 2026-05-13 — 03-navigation — No Pixel Grid auto-show beyond ~500%

**Photoshop behavior:** Past ~500% zoom, View > Show > Pixel Grid auto-appears.
**Photoweb behavior:** Pixel grid not implemented.
**Rationale:** Visual debugging aid; defer.

## 2026-05-13 — 04a-file-open-place — No Free Transform auto-arm on place / drop-as-layer

**Photoshop behavior:** Place Embedded (or drag-drop into existing doc) pre-arms Free Transform so the user resizes / repositions the image before committing with the Options Bar check mark. Multi-file drops pause for each image so the user can transform-and-commit one at a time.
**Photoweb behavior:** The image lands at native size, position (0, 0), already committed. User can then press Cmd+T for Free Transform.
**Rationale:** Pre-arming the existing Free Transform flow needs an event-trigger and a way to auto-commit between files. Convenience polish deferred to a follow-up.

## 2026-05-13 — 04a-file-open-place — No Home Screen / Recent Files panel

**Photoshop behavior:** Drop on Home Screen opens as new doc; Home Screen also lists recent file thumbnails.
**Photoweb behavior:** No Home Screen; drop on blank workspace opens as new doc.
**Rationale:** `home_screen` excluded per CLAUDE.md §4.

## 2026-05-13 — 04a-file-open-place — Load Files into Stack omits auto-align + Smart Object options

**Photoshop behavior:** File > Scripts > Load Files into Stack opens a dialog with "Attempt to Automatically Align Source Images" and "Create Smart Object after Loading Layers" checkboxes.
**Photoweb behavior:** Plain multi-select OS file picker — each chosen file becomes a layer; no align, no Smart Object.
**Rationale:** Smart Objects excluded per CLAUDE.md §4; auto-align is a complex photo-merging algorithm out of scope.

## 2026-05-13 — 04a-file-open-place — No Open With / Camera Raw routing

**Photoshop behavior:** Open dialog has "Open As" and routes raw files to Camera Raw.
**Photoweb behavior:** Single OS file picker; no raw support.
**Rationale:** `camera_raw` excluded per CLAUDE.md §4.

## 2026-05-13 — 04b-file-new — Background Contents drops "Background Color"

**Photoshop behavior:** New Document dialog's Background Contents lists White / Black / Background Color / Transparent / Custom.
**Photoweb behavior:** White / Black / Transparent / Custom.
**Rationale:** photoweb doesn't yet surface a global Background swatch reachable from this dialog; shipping a half-wired control would mislead. Revisit when the Color/Swatches cluster lands.

## 2026-05-13 — 04b-file-new — Category tabs reduced to Recent / Saved / Photo / Web

**Photoshop behavior:** New Document tabs are Recent / Saved / Photo / Print / Art & Illustration / Web / Mobile / Film & Video.
**Photoweb behavior:** Recent / Saved / Photo / Web only.
**Rationale:** Print excluded by CLAUDE.md §4 (`print_output`); Mobile, Film & Video, Art & Illustration each lack a use-case in browser-based photo editing right now. Deferred without prejudice.

## 2026-05-13 — 04b-file-new — Pixels-only unit, no inches/cm/mm

**Photoshop behavior:** New Document W/H and Resolution dropdowns each select a unit (Pixels / Inches / Centimeters / Millimeters / Picas).
**Photoweb behavior:** Width and Height fixed to Pixels; Resolution stays Pixels/Inch but only editable as ppi.
**Rationale:** Document model is pixel-native; there's no unit-conversion harness wired into other dialogs. Adding one for a single field is scope creep beyond cluster 04b.

## 2026-05-13 — 04b-file-new — Untitled-N persists across reloads

**Photoshop behavior:** `Untitled-N` counter resets when Photoshop quits.
**Photoweb behavior:** Counter persists in localStorage and continues across browser reloads.
**Rationale:** Browser has no process-lifetime equivalent of "quit Photoshop". Persisting matches the in-session habit users have of seeing `Untitled-2`, `Untitled-3` etc. without the counter resetting whenever they refresh the tab.

## 2026-05-13 — 04c-file-save-close — Save As Format list omits PSD, TIFF, GIF, BMP

**Photoshop behavior:** Save As Format dropdown lists ~15 formats (Photoshop, JPEG, PNG, TIFF, GIF, BMP, EPS, PSB, …).
**Photoweb behavior:** Three formats — Photoshop Document (.pwbdoc), JPEG (.jpg), PNG (.png).
**Rationale:** Smart Objects / PSD parity / print formats are scope-excluded ([CLAUDE.md §4](../../CLAUDE.md)). JPEG + PNG cover the canonical browser-export cases; the internal Photoshop Document keeps layered saves inside photoweb's OPFS-backed store.

## 2026-05-13 — 04c-file-save-close — "Photoshop Document" writes .pwbdoc to OPFS, not .psd to disk

**Photoshop behavior:** Save As → Photoshop writes a layered .psd file to the user-chosen disk location.
**Photoweb behavior:** Writes a .pwbdoc JSON manifest into OPFS / localStorage under the chosen name.
**Rationale:** Browsers cannot write arbitrary disk paths without per-save File System Access gestures; PSD parity is also excluded. The .pwbdoc format keeps layer data round-trippable within photoweb's own document store.

## 2026-05-13 — 04c-file-save-close — JPEG Options omits Preview and file-size readout

**Photoshop behavior:** JPEG Options shows a Preview checkbox and a live file-size readout (e.g. "8.4M").
**Photoweb behavior:** Quality slider + Format radios only.
**Rationale:** A live size readout requires re-encoding the JPEG every time Quality changes; the preview requires also decoding the result back into a thumbnail. Neither is load-bearing for the muscle-memory contract (Quality slider + Baseline radios are what users adjust). Deferred.

## 2026-05-13 — 04c-file-save-close — JPEG Baseline radios accepted but encoder uses browser default

**Photoshop behavior:** Baseline ("Standard") / Baseline Optimized / Progressive controls the JPEG marker layout.
**Photoweb behavior:** The radios are visible and the choice is captured, but `canvas.toBlob('image/jpeg', q)` always writes the browser's default JPEG (typically optimized).
**Rationale:** The browser canvas encoder does not expose the baseline switch. The choice is preserved for parity with Photoshop's UI; future-us can rewrite via a JS encoder if a real difference becomes necessary.

## 2026-05-13 — 04c-file-save-close — No Home Screen on last Close

**Photoshop behavior:** Closing the last document returns to the Home Screen with thumbnails of recent files.
**Photoweb behavior:** The viewport's existing empty-state overlay ("Open or drop an image to begin") takes over.
**Rationale:** `home_screen` is excluded per [CLAUDE.md §4](../../CLAUDE.md). The empty-state overlay communicates the same "no document open" idea using the surface photoweb already has.

## 2026-05-13 — 04c-file-save-close — Close All collapses to Close (no Apply to All)

**Photoshop behavior:** Close All iterates open documents, showing a save-changes prompt with an "Apply to All" checkbox for the rest of the stack.
**Photoweb behavior:** Single-document. Cmd/Ctrl+Alt+W reuses the single-doc Close path; no "Apply to All" checkbox.
**Rationale:** `multi_doc_ui` is excluded per [CLAUDE.md §4](../../CLAUDE.md). The Close All hotkey and menu entry exist so muscle memory is honored even though the underlying behavior matches plain Close.

## 2026-05-13 — 04c-file-save-close — No PSD Maximize Compatibility prompt

**Photoshop behavior:** Saving layered PSDs prompts to maximize compatibility with other apps / older Photoshop versions.
**Photoweb behavior:** No prompt; the internal .pwbdoc format is the only layered save target.
**Rationale:** PSD export is not in scope.
