# HUMAN-REVIEW — cluster 01-app-basics

**Tick stopped at §3 (Read & analyse) per RUN-CONTRACT §7 stop bar:** *"The cluster touches more than 3 unrelated subsystems and would benefit from a smaller split."* Two related stop criteria would also fire downstream (>40 file edits; non-trivial UX divergences without pre-existing entries in divergence-log.md).

## What I found after reading 5 of 10 lessons

The 10 lessons in this cluster cover the entire Photoshop UI chrome — orientation tour through interface variants, toolbar, panel system, screen modes, neutral color mode, pasteboard color, color themes, search bar, document tab + status bar. Each surface needs its own Feature spec with full interaction choreography (cursor changes, modifier behavior, Esc/Enter semantics, Options Bar updates per the new §5 template).

Lessons read in this tick:
- `learning-the-photoshop-interface` — chapter intro and table of contents.
- `getting-know-photoshop-interface` — orientation tour: Document window, Toolbar, Options Bar, Menu Bar, panels, Search bar, Workspaces.
- `interface` — Photoshop CS4 interface tour (Tools panel, Options Bar, Application Bar, Application Frame).
- `interface-cs6` — color themes (Shift+F1 / Shift+F2 cycle), pasteboard color picker.
- `photoshop-tools-toolbar-overview` — toolbar layout, hidden-tool flyout, default-tool memory, keyboard letter + Shift+letter cycle, full ~70-tool reference.

Did NOT yet read: `managing-panels-photoshop-cc`, `managing-panels-in-photoshop-cs6`, `hide-photoshop-with-screen-modes-and-interface-tricks`, `photoshop-screen-modes-interface-tricks`, `remove-distractions-with-neutral-color-mode-in-photoshop-2022`. Did NOT open any images.

## The subsystems uncovered

1. **Interface shell** — Document window, pasteboard, status bar info menu, color profile display, document tab (name + zoom + click-to-switch).
2. **Toolbar** — single/double column toggle, hidden-tool flyout (click-and-hold AND right-click), default-tool memory, `M` / `Shift+M` and similar keyboard cycles, tool group ordering convention.
3. **Options Bar** — per-tool option rendering, updates on tool switch.
4. **Menu Bar** — already exists in photoweb; lesson content confirms layout matches.
5. **Panel system** — panel groups + tabs, Window menu list with checkmark for open panels, panel menu icon (top-right of each panel), dock/float/resize.
6. **Screen modes** — Standard / Full Screen with Menu Bar / Full Screen; `F` cycle forward, `Shift+F` cycle back.
7. **Color theming** — 4 interface color themes (Edit/Photoshop > Preferences > Interface), `Shift+F1`/`Shift+F2` keyboard cycle, independent pasteboard color picker via right-click on pasteboard.
8. **Neutral Color Mode** (CC 2022.5+) — Preferences > Interface toggle that hides cosmetic UI gradients to remove visual distractions.
9. **Search bar** (CC) — likely out of scope per CLAUDE.md §4 "Help, release notes ... or product-support features inside the app"; needs an explicit divergence-log entry either way.

That's 8 in-scope subsystems plus 1 likely-divergence. Each needs a Feature spec at the new contract's depth.

## Proposed split

Replace `01-app-basics` in [work-queue.md](../work-queue.md) and [clusters.json](../clusters.json) with **four focused clusters**. All 10 original lessons are redistributed; nothing is dropped.

```
- [ ] 01a-interface-shell        (4) — Document window, status bar, pasteboard, interface orientation
- [ ] 01b-toolbar                (1) — Toolbar UI: single/double column, hidden-tool flyout, default-tool memory, letter+Shift cycle
- [ ] 01c-panels                 (2) — Panel groups, Window menu list, panel menu icon, dock/float
- [ ] 01d-screen-modes-theme     (3) — Screen modes (F / Shift+F), color theme (Shift+F1/F2), pasteboard color, Neutral Color Mode
```

Slug assignments:

- **01a-interface-shell** — `learning-the-photoshop-interface`, `getting-know-photoshop-interface`, `interface`, `interface-cs6`.
- **01b-toolbar** — `photoshop-tools-toolbar-overview`.
- **01c-panels** — `managing-panels-photoshop-cc`, `managing-panels-in-photoshop-cs6`.
- **01d-screen-modes-theme** — `hide-photoshop-with-screen-modes-and-interface-tricks`, `photoshop-screen-modes-interface-tricks`, `remove-distractions-with-neutral-color-mode-in-photoshop-2022`.

Each of the four clusters has 1–3 closely-related subsystems and should fit one tick comfortably. `01b-toolbar` is small enough to stand alone because the toolbar's interaction choreography (click-and-hold timing, fly-out menu, default-tool memory, keyboard letter vs Shift+letter cycle, right-click alternate path) is dense and deserves a complete spec without competing for attention.

## To unblock the loop

1. Apply the split: edit [work-queue.md](../work-queue.md) and [clusters.json](../clusters.json) (or ask Claude to). Move `interface-cs6` and `interface` into `01a` even though they cover legacy version notes — the orientation content is still useful, and color-theme / Application Frame trivia routes to the right cluster (`01d` and `01a` respectively).
2. Delete this `HUMAN-REVIEW.md` (the file's continued existence blocks every future /loop pre-flight per §1).
3. The cron is still scheduled (job `adec9056`, every 2h at :07). Next fire will pick `01a-interface-shell` and produce a focused plan + commit.

## What was NOT done in this tick

- No branch created — still on `main`.
- No code changed. Read 5 of 10 lessons; did not open any images.
- No `gap-report.md` or `plan.md` written for `01-app-basics`; the cluster id is being retired.
- No work-queue.md or clusters.json edits — left for you to confirm the split first.
