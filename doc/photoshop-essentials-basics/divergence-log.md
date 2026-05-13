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

