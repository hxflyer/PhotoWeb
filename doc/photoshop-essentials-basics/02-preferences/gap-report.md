# gap-report — 02-preferences

## Lessons reviewed

- `essential-photoshop-preferences-beginners` (CC + CS6) — Preferences dialog with category sidebar (General / Interface / Tools / File Handling / Performance / Scratch Disks / Cursors / Transparency & Gamut / Units & Rulers / Plug-ins / Type / 3D). Detailed walkthrough of: Export Clipboard (General), Color Theme + Highlight Color + UI Font Size (Interface), Show Tool Tips + Use Shift Key for Tool Switch (Tools in CC, scattered in CS6), Auto Save + Recent File List Contains (File Handling), Memory Usage + History States (Performance), Scratch Disks.
- `preferences` (CS5) — same dialog ancestor. CS5 dialog has fewer categories. Notable: Image Interpolation default (Bicubic Sharper recommended for resize down).
- `preferences-cs3` (CS3) — older variant. Same broad categories. Mentions Image Interpolation, Export Clipboard, History States.
- `background-auto-save-cs6` — Background Save lets Photoshop save large files asynchronously while the user keeps working; Auto Save backs up at intervals.

## Current photoweb coverage

- [src/components/Dialogs/PreferencesDialog.tsx](src/components/Dialogs/PreferencesDialog.tsx) — flat single-pane dialog. Five rows:
  - Interface section (added in 01a): Color Theme thumbnails, Neutral Color Mode checkbox (added in 01e)
  - History max size (commit-on-Save)
  - Autosave interval (commit-on-Save)
  - UI scale slider (commit-on-Save)
  - Cancel / Save buttons
- [src/core/autoSave.ts](src/core/autoSave.ts) + the recovery banner in App.tsx — already implement Auto Save and recovery. Async by construction (browser File System Access API / localStorage), so "background save" is implicit.
- [src/App.tsx:454-461](src/App.tsx#L454-L461) — `F` cycles screen modes (01d). Earlier in the same handler, `M / Shift+M`, `L / Shift+L`, etc. cycle tools — Shift is **required** to cycle. Photoshop calls this the "Use Shift Key for Tool Switch" preference (default ON, photoweb matches default but offers no toggle).
- No category sidebar. No `Use Shift Key for Tool Switch` toggle. No `Show Tool Tips` toggle. No `Highlight Color` (Default Gray / Blue) setting for selected layer.

## Gaps

| # | Gap | Where |
|---|---|---|
| 1 | **Preferences dialog has no category sidebar.** Photoshop users opening Preferences expect a left-rail with General / Interface / Tools / File Handling / Performance / etc. and a content pane on the right. | [PreferencesDialog.tsx](src/components/Dialogs/PreferencesDialog.tsx) — full re-layout. |
| 2 | Existing rows are not organised into categories. | Same file. |
| 3 | No `Use Shift Key for Tool Switch` toggle. Photoshop's letter+Shift convention is wired but never user-overridable. Some users prefer plain-letter cycling. | New `useShiftForToolSwitch` in viewSlice + Preferences > Tools row + App.tsx wiring. |
| 4 | No `Show Tool Tips` toggle. HTML `title` attrs render natively in the browser; gating them universally is a deep refactor. | Defer (see §6 divergences). |
| 5 | No `Highlight Color` (Default Gray / Blue) for selected layer. | Defer. |
| 6 | Background save progress indicator in document tab + status bar. | Defer — photoweb's saves are short and async-by-construction; the indicator is convenience polish. |
| 7 | Image Interpolation default (Bicubic Sharper). | Defer to cluster 05a-image-size where the Image Size dialog also exposes interpolation. |
| 8 | Recent File List Contains. | Photoweb has no Recent Files panel (home screen excluded per CLAUDE.md §4). Defer. |
| 9 | Scratch Disks / Memory Usage. | Browsers manage these; not user-controllable. Permanent divergence. |

## Photoshop-habit mismatches

1. **Dialog layout**: category sidebar on the left + content on the right. Grounded in `essential-photoshop-preferences-beginners/images/getting-started-preferences-photoshop-preferences-dialog-box-588b210e.png`.
2. **Category names**: General, Interface, Tools, File Handling, Performance (we'll ship these five; the rest are out of scope or future-cluster).
3. **Use Shift Key for Tool Switch** lives under **Tools** in CC, under **General** in CS6. We adopt CC's location.
4. **Default ON** for Use Shift Key for Tool Switch (lesson body line 160). Photoweb already matches the default; the toggle just exposes user control.
5. **Buttons**: Cancel / OK. Photoshop's modal applies on OK and discards on Cancel. Photoweb currently uses "Cancel" / "Save"; we'll keep "Save" since it matches photoweb conventions.

## UI / UX issues separate from §4

- The current dialog mixes commit-on-Save fields (history, autosave interval, UI scale) with live-apply fields (color theme, neutral color mode). This is acceptable — Photoshop also has a few live-applies — but worth keeping in mind for cluster artifacts: when the user clicks Cancel, the live-apply changes are NOT reverted. Out of scope for this tick.
- Photoshop's UI Font Size is a discrete dropdown (Tiny / Small / Medium / Large); photoweb has a continuous slider. Slider has more flexibility, but Photoshop fluency prefers the discrete option. Defer migration.

## Photoshop divergences worth keeping (or permanent)

- **No Scratch Disks** — browser environment manages memory and disk. Permanent.
- **No Memory Usage slider** — browser-managed. Permanent.
- **No Export Clipboard option** — browser clipboard is OS-managed, not opt-in. Permanent.
- **No Background Save progress indicator** this tick — convenience polish for very large saves; defer.
- **No Highlight Color (Default Gray / Blue)** this tick — small Layers-panel CSS change; defer.
- **No Show Tool Tips toggle** this tick — browser's native title-attr rendering can't be CSS-suppressed; would require app-wide `title` attribute gating. Defer.
- **UI Font Size remains a slider** instead of discrete dropdown. Defer.
- **Recent File List Contains** — no recent-files panel in photoweb (home/start screen excluded per CLAUDE.md §4). Defer permanently for the panel; the count setting could exist if the panel ever arrives.
