# 04b-file-new — Plan

## 1. Goals (Feature specs)

### F1 — Clipboard-driven W/H/Resolution prefill ("Same size as open document")

**What it does** — A Photoshop user who runs Select > All → Edit > Copy on an open document, then File > New, expects the New Document dialog to **open with Width / Height / Resolution already filled in** with the dimensions of what they just copied. No transcribing, no mental arithmetic. After Create, the new doc matches the copied content's pixel size exactly.

**Photoshop habit preserved** — Lesson `create-new-photoshop-document-same-size-as-open-document` step 4 (image `cc-open-document-same-size-photoshop-new-document-details-865c5237.png`): the user copies a 5472 × 3648 px @ 300 ppi raster; File > New opens with `5472 / 3648 / 300 / Pixels/Inch` already set. Cmd/Ctrl+A → Cmd/Ctrl+C → Cmd/Ctrl+N is the canonical three-shortcut workflow.

**Invocation** —
- After any successful Edit > Copy (raster image data) of the active document: dimensions of the **copied bounding rectangle** (= selection bounds if any, else full document) are remembered.
- When File > New is opened (Cmd/Ctrl+N, menu File > New) and the remembered clipboard dimensions are non-zero, the dialog opens with those W/H/resolution as the initial values — overriding the default 1920×1080 preset.
- Selecting any preset on the left rail still works and discards the autofill (user opt-out).

**Pre-conditions** —
- A raster document must be open at the time of Edit > Copy.
- Edit > Copy must have populated the clipboard with image data (not just text). If the copy was empty or non-raster, no autofill occurs.
- If clipboard dimensions exceed `MAX_DOC_PIXELS`, autofill clamps to defaults (the existing guard in `newDocument` still runs at Create-time).

**Interaction choreography** —
1. User clicks on an open raster document; presses Cmd/Ctrl+A → marching ants appear around full canvas; status bar/title shows nothing special.
2. User presses Cmd/Ctrl+C — copies. Photoweb writes (a) image data to the system clipboard if available, and (b) **records `{ width, height, resolution }`** in a per-store `clipboardImageInfo` slot. Selection still active.
3. User presses Cmd/Ctrl+N (or File > New). Dialog opens. Cursor is a default arrow. Width / Height / Resolution inputs show `5472 / 3648 / 300` (in the example). The preset selection in the left rail moves to **"From Clipboard"** — a synthetic preset row at the top of the Recent tab that reads "Clipboard, 5472 × 3648 @ 300 ppi". The orientation toggle reflects W vs H.
4. User presses Enter — Create fires; new untitled doc is allocated at exactly those pixels. Dialog closes; the new doc is fit to viewport.
5. **Esc** at any time cancels; the clipboard memory remains for the next invocation.
6. If the user clicks a different preset row before pressing Create, autofill is overridden and the synthetic "From Clipboard" row deselects but stays visible until the dialog closes.

**Visual feedback** —
- The "From Clipboard" row in the preset rail uses the same selection highlight as any other preset (the blue left-border + tinted background already present at [NewDocumentDialog.tsx:122-123](src/components/Dialogs/NewDocumentDialog.tsx#L122-L123)).
- Width / Height / Resolution inputs show the prefilled numbers; no toast — the dialog itself is the feedback surface.

**Post-conditions** —
- Document allocated at the clipboard dimensions; one history entry "New Document".
- Clipboard memory is **not** cleared after Create; it remains until the user copies again or replaces the document.

**Edge cases** —
- Edit > Copy on a partially-selected region: record the **selection bounding box** dimensions (not full document), matching Photoshop's behavior where Select > rectangular marquee → Copy stores the marquee size.
- Edit > Copy on a transparent / fully-clipped selection: no image data, no autofill.
- Clipboard dimensions exceed `MAX_DOC_PIXELS`: existing `guardDocumentSize` will reject at Create-time and toast; do not pre-reject in the dialog (let the user adjust).
- Multiple Copy operations: only the most recent is remembered.
- Page reload: dimensions are in-memory only and are forgotten. (Persisting clipboard meta to localStorage is unsafe — the actual system clipboard may have changed.)

---

### F2 — Category tabs (Recent / Saved)

**What it does** — Replaces the flat preset list with a top tab bar (Recent | Saved | Photo | Web) that switches the preset gallery between user history, user-saved presets, and a small built-in pack per category. A Photoshop user reaching for the New dialog sees a familiar tabbed layout instead of a single rail of mixed-purpose presets.

**Photoshop habit preserved** — Lesson `create-new-documents-photoshop-cc` image `02-opening-images-03-create-new-document-photoshop-cc-new-document-dialog-cc3ddc6f.jpg`: the dialog header reads `Recent | Saved | Photo | Print | Art & Illustration | Web | Mobile | Film & Video`. photoweb keeps the active category highlighted with a thin blue underline. We carry over **Recent**, **Saved**, **Photo**, and **Web** — the categories whose presets are meaningful for a browser-based photo editor. Print/Mobile/Film & Video/Art & Illustration are deferred (Print is excluded by CLAUDE.md §4 — `print_output`; the rest can be added when a clear use-case appears, see §2).

**Invocation** —
- Click a tab name in the top tab bar.
- Left/Right arrow keys while focus is in the preset gallery cycle between tabs (Photoshop honours this; carry it over).

**Pre-conditions** — None; available whenever the dialog is open.

**Interaction choreography** —
1. Dialog opens. Active tab is **Recent** if any history exists; **Photo** otherwise. Cursor: default arrow over the tab bar.
2. User clicks **Saved**. Tab bar's blue underline animates to Saved. Gallery below redraws with saved-preset tiles (or "No saved presets yet" placeholder text). Cursor stays default.
3. User clicks a preset tile. Preset Details (right rail) updates with the tile's W/H/resolution/orientation/background. Tile gets the highlighted selection ring.
4. User presses Tab → focus moves into the gallery; arrow keys (Left/Right/Up/Down) move between tiles within the active tab; Enter activates the tile (same as click).
5. Escape closes the dialog.

**Visual feedback** —
- Active tab: text in white + a 2px solid `#0090ff` underline.
- Inactive tab: text in `#aaa`, no underline.
- A small badge `(N)` after **Recent** and **Saved** showing the count, matching Photoshop's `YOUR RECENT ITEMS (6)` label visible in the dialog screenshot.

**Post-conditions** —
- The active tab is **session-local**; it does not persist across reloads. The Recent and Saved arrays *do* persist in localStorage.
- When a doc is successfully created, push `{ w, h, resolution, background, name, ts }` onto Recent (cap 8, most-recent-first).

**Edge cases** —
- Empty Recent: show "Nothing here yet" placeholder; tab is still clickable.
- Empty Saved: show "Saved presets will appear here. Click the save icon next to the document name to save one."
- localStorage quota / corrupted JSON: catch and reset that slot, do not crash the dialog.

---

### F3 — Portrait / Landscape orientation buttons

**What it does** — Two icon buttons inline with the Height field. Clicking the inactive icon swaps Width ↔ Height (and the resolution stays put). Photoshop users use this to flip a 16:9 web spec to a 9:16 mobile spec without retyping.

**Photoshop habit preserved** — Lesson 1 image `02-opening-images-03-create-new-document-new-document-portrait-landscape-orientation-0a5cfc5a.png`: two square buttons; the active one is filled blue, the inactive is dark grey. Photoshop labels them "Portrait" and "Landscape" via tooltip.

**Invocation** — Click on the inactive icon. (No keyboard shortcut in Photoshop; we won't invent one.)

**Pre-conditions** — Width and Height inputs both have valid positive values. If they are equal, both buttons read as inactive (neither orientation applies) and clicking either flips to that orientation (no-op visually, but commits state).

**Interaction choreography** —
1. User views dialog. Width = 1920, Height = 1080 → Landscape button is active (filled blue). Cursor over inactive Portrait button is `pointer`.
2. User clicks Portrait. Width and Height swap → 1080 × 1920. Portrait now active. The text inputs update visibly; this happens within React state so no flicker.
3. Re-clicking the now-active button is a no-op (Photoshop behavior).
4. After clicking a preset on the left rail, the orientation buttons reflect that preset's W vs H.

**Visual feedback** — Filled blue background on the active button (`#0090ff` with 20% opacity, matching the existing preset highlight); 1px dark border on inactive. Icon: tall rectangle ↔ wide rectangle (use [scripts/icon_grid.py](../../../scripts/icon_grid.py)).

**Post-conditions** — State only changes in-dialog; nothing persisted until Create.

**Edge cases** —
- Width = Height: neither button visually active. Either click swaps a no-op pair (W stays = H).
- One of the values is invalid (zero / non-numeric mid-edit): orientation buttons render but clicking is a no-op until both fields commit.
- Custom width >> max: the swap still happens; create-time guard catches it.

---

### F4 — Background Contents: Custom color

**What it does** — Adds **Custom** to the Background Contents dropdown. Selecting Custom opens a color picker; the chosen color is stored locally to the dialog and the preview swatch beside the dropdown reflects it. On Create, the document's Background layer is filled with that color.

**Photoshop habit preserved** — Lesson 1 image `02-opening-images-03-create-new-document-more-background-color-choices-9e9622e9.png`: the dropdown lists `White / Black / Background Color / Transparent / Custom` with a chip preview to the right that flips to a checkerboard when Transparent is active and to the chosen color when Custom is active. We carry over: White / Black / Transparent / Custom. We omit "Background Color" because photoweb does not yet expose a global foreground/background swatch in the dialog context — adding that surface belongs to a later cluster on the color panel.

**Invocation** —
- Open the Background Contents `<select>` and choose Custom.
- The chip swatch right of the dropdown is **clickable** any time Custom is the active mode and opens the picker again.

**Pre-conditions** — None.

**Interaction choreography** —
1. User opens Background Contents dropdown. Cursor: default. Five rows: White (default), Black, Transparent, Custom.
2. User picks Custom. The native browser color picker opens (via an `<input type="color">` triggered programmatically). Cursor in the picker is OS-defined.
3. User chooses `#ff0040` → picker closes; the chip swatch right of the dropdown turns red; the dropdown text reads "Custom".
4. User clicks the red chip → picker reopens with `#ff0040` selected. They pick `#000080` → chip turns navy.
5. User clicks Create. Document background layer is filled with `#000080`.

**Visual feedback** — A 16×16 swatch to the right of the dropdown. For Transparent, the swatch shows a small CSS checkerboard (alternating `#ccc`/`#eee` 4-px tiles). For named colors, the swatch is that color; for Custom, the chosen color. The dropdown label updates immediately.

**Post-conditions** — Dialog state only until Create. After Create the document's Background layer is filled with the chosen color (the existing `newDocument(w, h, bg)` API already accepts an arbitrary color string).

**Edge cases** —
- User picks Custom then dismisses the picker without choosing: revert dropdown to its previous value (White or last named choice). The chip swatch reverts too.
- jsdom has no real native picker; the picker invocation uses an `<input type="color">` ref that tests can target by data-testid (we'll set the value via `fireEvent.input` rather than asserting that the OS picker visibly opened).
- Invalid hex string from the input: guarded — the `<input type="color">` already produces a valid `#rrggbb`.

---

### F5 — Document name input + Save Preset / Saved presets

**What it does** — Adds the `Untitled-N` name input at the top of the right rail with a small save icon. The name becomes the new document's `documentName`. Clicking the save icon adds the current Preset Details (name + W/H/resolution/orientation/background) to the user's saved-preset list, available under the **Saved** tab on the next dialog open. Hovering a saved preset tile reveals a trash icon to delete it.

**Photoshop habit preserved** — Lesson 1 images `02-opening-images-03-create-new-document-photoshop-cc-new-document-dialog-cc3ddc6f.jpg` (name + save icon at top of right rail) and `02-opening-images-03-create-new-document-new-saved-document-preset-0e83f68e.png` (saved preset tile on the Saved tab) and `02-opening-images-03-create-new-document-delete-saved-preset-61995533.png` (trash on hover).

**Invocation** —
- **Name**: top of right rail; defaults to `Untitled-N` where N is `nextUntitledIndex` (persisted, incremented on Create). User can edit freely.
- **Save Preset**: click the floppy-disk icon to the right of the name. Persists the current preset details to `photoweb:newDocPresets:v1`.
- **Recall saved preset**: tab Saved → click preset tile.
- **Delete saved preset**: hover the tile → trash icon appears in top-right → click → removes the entry (with confirm? no — Photoshop removes without confirmation; we match that).

**Pre-conditions** — Save Preset requires the name to be non-empty. Otherwise no-op + toast: "Name the document before saving the preset."

**Interaction choreography** —
1. Dialog opens. Right rail's name field shows `Untitled-1` selected (so typing replaces it). Cursor: text caret.
2. User types `My PSD layout`. Field text updates.
3. User clicks the save icon next to the field. The icon flashes (200ms blue → grey) as feedback; nothing else moves.
4. User switches to **Saved** tab → a tile appears with the rectangle thumbnail (proportion-preserved mini-rectangle inside a 96×96 box), title `My PSD layout`, sub-line `1920 × 1080 @ 72 ppi`.
5. User hovers the tile → trash icon fades in top-right; cursor over trash is `pointer`. Click → tile disappears.
6. User clicks Create with the original (un-trashed) preset → document is created with `documentName = 'My PSD layout'`; `nextUntitledIndex` is **not** incremented (it only increments when the name was an unedited `Untitled-N`).

**Visual feedback** —
- Save icon: 16×16 SVG, slightly emphasized on hover (`#0090ff`).
- Trash icon on saved tile: appears on `:hover` of the tile, top-right, white-on-red `#aa3333` background.
- After successful save, no toast — the appearance of the tile in the Saved tab is sufficient feedback.

**Post-conditions** —
- Saved presets are stored in localStorage at `photoweb:newDocPresets:v1` as an array of `{ id, name, width, height, resolution, background, orientation, ts }`.
- `nextUntitledIndex` is stored at `photoweb:newDocUntitledIndex:v1`.
- Created document's `documentName` is set to the dialog name (Photoshop habit — same `Untitled-N` becomes the doc title).

**Edge cases** —
- Duplicate names: allowed; no merge. Each save appends a new entry.
- Save with empty name: blocked (toast).
- Trash with single remaining preset → list becomes empty, placeholder text shown.
- localStorage write fails (quota): toast with "Couldn't save preset"; do not crash.
- Concurrent dialogs (we only have one — but if reopened mid-edit, last-write-wins on the saved list).

---

## 2. Out-of-scope this tick (deferred)

- **Photo / Web built-in preset packs.** Plan is to ship Recent + Saved + a small Photo and Web pack. If the implementation diff grows past the 40-edit stop bar (it won't, but as a guard), the built-in packs can be a follow-up — Recent/Saved alone already restore the principal Photoshop habit.
- **Color Mode / Bit Depth controls.** Out of scope (sRGB-only). Divergence-logged.
- **Artboards toggle.** Out of scope.
- **Advanced Options (Pixel Aspect Ratio, Color Profile).** Out of scope.
- **Home Screen "Create New" entry.** [CLAUDE.md §4](../../CLAUDE.md) excludes `home_screen`.
- **Adobe Stock template strip.** Adobe ecosystem; excluded.
- **Legacy New Document Dialog toggle.** [CLAUDE.md §4](../../CLAUDE.md) excludes `legacy_ui`.
- **Inches / cm / mm unit selectors.** Resolution input becomes editable, but the W/H unit stays Pixels. Adding inches/cm requires a unit conversion harness that does not exist; deferred until a print or image-size cluster pulls it in.
- **Preset thumbnails with rendered proportion previews on the built-in packs.** Drawn proportion-preserved rectangles inside 96×96 tiles is achievable but is bulk that doesn't add habit-fidelity — placeholder rectangles fit current scope. Saved/Recent get a small proportion-preview tile; Photo/Web packs can ship later.

## 3. Files to edit / files to create

**Create**
- `src/utils/newDocPresets.ts` — localStorage helpers for saved presets + Recent + nextUntitledIndex. Pure functions; no React. (Feature specs F2, F5)
- `src/assets/icons/orientation-portrait.svg` — Portrait icon (generated via `scripts/icon_grid.py`). (F3)
- `src/assets/icons/orientation-landscape.svg` — Landscape icon. (F3)
- `src/assets/icons/save-preset.svg` — Floppy/save icon for save action. (F5)
- `src/assets/icons/trash.svg` — Trash icon for delete. (F5) — reuse if one already exists; see check below.

**Edit**
- `src/components/Dialogs/NewDocumentDialog.tsx` — full restructure: tab bar + gallery + Preset Details right rail with name/save/orientation/Bg+Custom. (F1, F2, F3, F4, F5)
- `src/store/types.ts` — add `clipboardImageInfo: { width, height, resolution } | null` to the appropriate slice (likely `documentSlice` or a new `clipboardSlice`). (F1)
- `src/store/documentSlice.ts` — `newDocument(w, h, bg, name?)` accepts an optional document name; `recordClipboardImageInfo({ width, height, resolution })`. (F1, F5)
- Wherever Edit > Copy is currently dispatched — call `recordClipboardImageInfo` after a successful raster copy. (F1)
- `src/test/setup.ts` — ensure localStorage is reset between tests (probably already is; verify).

**Verify (no edit expected)**
- `src/App.tsx` keyboard handler for Cmd+N — already in place.
- `src/components/layout/MenuBar.tsx` File > New — already in place.

## 4. Test cases

All under `src/test/newDocumentDialog.test.tsx` (new file) unless noted. Simulator-driven per CLAUDE.md §5.

1. **F1 — Cmd+A → Cmd+C → Cmd+N prefills W/H.** Open an existing test fixture document at 640×400, run the Select All → Copy → New keyboard sequence, assert dialog width input shows `640` and height input shows `400`. **Tests the Photoshop habit shortcut end-to-end.**
2. **F1 — Selection bbox vs full doc.** Set a 200×150 marquee, Copy, open dialog → assert W=200, H=150 (bbox-driven autofill).
3. **F1 — Empty clipboard → no autofill.** Open dialog without prior copy → default preset values.
4. **F2 — Tabs Recent / Saved.** Render dialog with non-empty Recent → assert `(N)` count badge; click Saved → assert active tab text/underline.
5. **F2 — Recent populated by Create.** Create twice with different sizes → assert Recent tab has 2 entries, most recent first.
6. **F3 — Orientation toggle swaps W↔H.** Set W=1920 H=1080 (Landscape active), click Portrait button → assert W=1080 H=1920.
7. **F3 — Orientation reflects preset choice.** Click a preset whose W > H → Landscape active; click a preset whose H > W → Portrait active.
8. **F4 — Custom background fills the document.** Choose Custom, set color to `#ff0000` via the color input, Create → assert `layerPixelAt(activeLayer, 5, 5)` is `[255, 0, 0, 255]`.
9. **F4 — Swatch reflects choice.** White selected → swatch background is white. Black → black. Transparent → swatch has a `checkerboard` data attribute. Custom + color → swatch background reads the chosen color.
10. **F5 — Save Preset round-trips.** Type "My layout", click save icon, close dialog, reopen → Saved tab shows tile with name "My layout".
11. **F5 — Trash deletes the saved preset.** From state of #10, hover tile, click trash → tile removed, localStorage entry gone.
12. **F5 — Document name carries to created doc.** Type "Hero Banner", Create → `useEditorStore.getState().documentName === 'Hero Banner'`.
13. **F5 — Untitled-N increments.** Create with default name → reopen → name input is `Untitled-2`.
14. **Photoshop hotkey end-to-end:** Cmd+N opens dialog, Enter inside no-input or on Create-focused button triggers Create. (Covers global hotkey path.)

All multi-step tests follow the choreography exactly — mouse-down on tab, type into name field, click save icon, switch tab, hover tile (jsdom mouseEnter), click trash — not collapsed into single store action calls.

## 5. Divergences from Photoshop

Append all to [divergence-log.md](../divergence-log.md).

- *Photoshop offers `White / Black / Background Color / Transparent / Custom` for Background Contents; photoweb offers `White / Black / Transparent / Custom`* because we don't surface a global Background Color swatch yet — that's a Color/Swatches panel cluster's responsibility, and shipping a half-wired control here would mislead users into expecting persistence.
- *Photoshop New Document tabs are Recent / Saved / Photo / Print / Art & Illustration / Web / Mobile / Film & Video; photoweb ships Recent / Saved / Photo / Web* because Print is excluded by [CLAUDE.md §4](../../CLAUDE.md) (`print_output`); Mobile/Film & Video/Art & Illustration are deferred until a use-case demands them.
- *Photoshop allows W/H unit selectors (Pixels / Inches / Centimeters / Millimeters / Picas); photoweb fixes the unit to Pixels* because the pixel-only document model has no centralized unit-conversion harness yet, and adding one for a single dialog would be scope creep beyond cluster 04b.
- *Photoshop's Background Contents has a "Background Color" entry that uses the global Background swatch; photoweb omits it* because the global Background swatch isn't yet surfaced in the dialog — deferred to a Color/Swatches cluster.
- *Photoshop names new docs `Untitled-N` reset only on quit; photoweb persists `nextUntitledIndex` in localStorage so the counter survives reloads* because the browser does not have a process-lifetime equivalent of "quit Photoshop"; persisting is the closest to the Photoshop habit of seeing `Untitled-2`, `Untitled-3` etc. across the working session.

## 6. Stop conditions specific to this cluster

- If the dialog refactor balloons past 5 files of UI work (excluding tests + icons), stop and write HUMAN-REVIEW.md — that signals the restructure deserves its own scope decision rather than tucking under "04b".
- If the clipboard-info plumbing demands changes in `historySlice` or `selectionSlice`, stop — that crosses subsystem boundaries beyond the cluster and should be its own ticket.
- If any test in #1-#13 above can't be expressed as a simulator-driven script (e.g. jsdom can't trigger the color picker meaningfully), keep the test but assert directly on the component's controlled state via a test-only mode/prop rather than removing the assertion. Don't `.skip`.
