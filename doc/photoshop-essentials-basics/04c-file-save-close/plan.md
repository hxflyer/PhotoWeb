# 04c-file-save-close — Plan

## 1. Goals (Feature specs)

### F1 — File > Close (Cmd/Ctrl+W) with save-on-close prompt

**What it does** — Closes the active document. If unsaved changes exist, Photoshop's three-button modal appears: *"Save changes to the Adobe Photoshop document '<name>' before closing?"* with `Don't Save` / `Cancel` / `Save`. `Save` runs the existing save flow then closes; `Don't Save` discards and closes; `Cancel` returns the user to the document untouched. After Close, the viewport returns to the empty-state overlay ("Open or drop an image to begin"). The user can then use File > New, File > Open, or drag-drop to start a new document.

**Photoshop habit preserved** —
- Hotkey: Cmd/Ctrl+W (lesson `close-images-photoshop` line 25).
- Menu: File > Close (same lesson).
- Tab × button (same lesson line 30, screenshot `interface-close-images-photoshop-close-image-document-tab-df59cd1e.png`).
- Modal title text "Save changes to the Adobe Photoshop document '<name>' before closing?" and three buttons `Don't Save` / `Cancel` / `Save` with `Save` highlighted blue (screenshot `interface-close-images-photoshop-save-before-closing-4824ceee.png`).

**Invocation** —
- Keyboard: Cmd/Ctrl+W.
- Menu: File > Close.
- Tab close button: click the leading × on the document tab (macOS-style position per the lesson screenshot).

**Pre-conditions** —
- A document must be open (`layers.length > 0`). Otherwise the menu entry is grayed; the hotkey is a no-op.
- The save-on-close prompt only appears when `isDirty === true`.

**Interaction choreography** —
1. User presses Cmd+W (or clicks tab × / File > Close).
2. If `isDirty` is false: doc closes immediately. Layers cleared, `documentName` cleared, `isDirty` cleared. Empty-state overlay appears in the viewport.
3. If `isDirty` is true: a modal opens centered on screen, title `Save changes to the Adobe Photoshop document "<name>" before closing?`. Three buttons left-to-right: `Don't Save` (subtle), `Cancel` (subtle), `Save` (filled blue, default). Focus lands on Save.
4. Modal keyboard:
   - `Enter` → Save (commits with current `documentName`, then closes on success; on failure stays open with a toast).
   - `Esc` → Cancel.
   - `Tab` / `Shift+Tab` cycle the three buttons.
   - On macOS: `Cmd+D` triggers Don't Save (Apple HIG, matches Photoshop on Mac).
5. Cursor: default arrow throughout; pointer on hover over each button.
6. After Close: viewport renders the existing empty-state overlay ([Viewport.tsx:1514-1531](src/components/Canvas/Viewport.tsx#L1514-L1531)); status bar shows zero dimensions; Document Tab hides (no name to render).

**Visual feedback** —
- Modal: dialog with photoweb's existing modal styling. Title centered, message centered, three buttons right-aligned at the bottom.
- After Close: the empty-state overlay already in place — no new UI.

**Post-conditions** —
- After Save → Close: `documentName` reset, `isDirty` reset, `layers = []`, `activeLayerId = null`, `selection` cleared, history cleared.
- After Don't Save: same as above but no save call made.
- After Cancel: state unchanged.

**Edge cases** —
- Save call fails (e.g. OPFS quota): toast surfaces the error; the prompt stays open; the doc is NOT closed.
- User opens a second close prompt while one is open (shouldn't happen because the dialog is modal, but guard against double-fire by making the close action a no-op when the prompt is up).
- Tab × clicked on a clean doc: closes immediately, no prompt.
- Tab × clicked while in Free Transform or text-edit mode: the existing modal-overlay handler should commit the gesture first. For this tick, we'll just gate on `freeTransform === null` and `text editing is not active` — if either is true, the close hotkey is a no-op (Photoshop habit: commit/cancel transform first).

---

### F2 — File > Close All (Cmd/Ctrl+Alt+W)

**What it does** — In Photoshop with multiple docs open, this closes every doc, prompting per-doc with an "Apply to All" checkbox. photoweb is single-document (CLAUDE.md §4 `multi_doc_ui` excluded), so Close All collapses to Close — but the menu entry and hotkey must exist so Photoshop muscle memory does not surprise the user.

**Photoshop habit preserved** — Hotkey Cmd/Ctrl+Alt+W (lesson line 37); menu File > Close All.

**Invocation** — Same as F1, plus Cmd/Ctrl+Alt+W.

**Pre-conditions** — Same as F1.

**Interaction choreography** — Identical to F1 (single doc → single prompt with no "Apply to All" checkbox).

**Visual feedback** — Same dialog as F1.

**Post-conditions** — Same as F1.

**Edge cases** — All from F1. No multi-doc edge cases because we are single-document.

---

### F3 — Save As Format selector + JPEG Options

**What it does** — Save As becomes a Photoshop-style dialog: Filename input + Format dropdown. The current minimal inline modal in App.tsx is replaced with a proper SaveAsDialog component. The Format dropdown lists `Photoshop Document (.pwbdoc)` (the existing OPFS-backed JSON manifest), `JPEG (.jpg)`, and `PNG (.png)`. Choosing JPEG and clicking Save opens the JPEG Options sub-dialog (Quality 1–12 slider + Baseline Standard / Baseline Optimized / Progressive radios). PNG saves immediately. Photoshop Document also saves immediately (existing OPFS path with the new name).

**Photoshop habit preserved** — Lesson `how-to-avoid-losing-your-original-images-in-photoshop` screenshots:
- `cc-avoid-losing-originals-save-as-copy-8fd6cb4d.png` — Save As with Format dropdown and filename field.
- `cc-avoid-losing-originals-jpeg-options-photoshop-cf6742de.png` — JPEG Options: Quality (1–12), Format Options radios (Baseline ("Standard") / Baseline Optimized / Progressive), Preview checkbox, file-size readout.

**Invocation** —
- Keyboard: Cmd/Ctrl+Shift+S (already wired at [App.tsx:374](src/App.tsx#L374)).
- Menu: File > Save As… ([MenuBar.tsx:162](src/components/layout/MenuBar.tsx#L162)).

**Pre-conditions** — At least one layer exists. With zero layers (empty state), Save As is grayed.

**Interaction choreography** —
1. User presses Cmd+Shift+S. SaveAsDialog opens centered, ~360px wide. Focus on the Name input, content pre-selected.
2. User edits Name (e.g. `Wedding_copy`). Type-as-you-go; no commit needed until Save.
3. User clicks the Format `<select>` and picks `JPEG (.jpg)`. The filename extension preview text below the input updates to `Wedding_copy.jpg`.
4. User clicks `Save` button (or presses Enter). Because format is JPEG, a second modal opens: **JPEG Options**.
5. JPEG Options modal: a Quality slider (1–12, default 12), three radio buttons (`Baseline ("Standard")`, `Baseline Optimized` (default), `Progressive`), and OK / Cancel buttons. No preview checkbox (we don't show a thumbnail), no file-size readout (a divergence — see §5).
6. User adjusts Quality to 10, clicks OK. The dialog encodes the flattened canvas at JPEG Q=10 (maps 1–12 → 0.0–1.0 quality) and downloads via browser `<a download>`. The new name (with `.jpg`) is used as the download filename. The first dialog closes too.
7. On success: toast `Saved "Wedding_copy.jpg"`. Modal closes. `documentName` updates to the new name. `isDirty` becomes false.
8. On `Cancel` in JPEG Options: returns to the Save As dialog (Name + Format still set).
9. PNG path: same dialog flow but skips the JPEG Options step. Downloads directly.
10. Photoshop Document path: writes `.pwbdoc` to OPFS under the new name (current behavior preserved).
11. Cursor: text caret in Name input; default arrow elsewhere.
12. Esc on either dialog closes it (no save).

**Visual feedback** —
- SaveAsDialog uses the same modal styling as NewDocumentDialog. Format select shows the file extension after the choice.
- JPEG Options is a smaller modal with `Quality: 10` numeric readout + 1–12 range slider + three radio buttons.
- After a successful Save As, the Document Tab updates to the new filename and the asterisk clears.

**Post-conditions** —
- Photoshop Document: OPFS `<name>.pwbdoc` written; `documentName = <name>`; `isDirty = false`.
- JPEG: a browser download of `<name>.jpg` triggered; `documentName = <name>.jpg`; `isDirty = false` (matches Photoshop's behavior of marking the active doc clean after Save As).
- PNG: a browser download of `<name>.png` triggered; `documentName = <name>.png`; `isDirty = false`.

**Edge cases** —
- User types a name with an extension already (`hero.jpg`) and selects PNG: respect the chosen Format. We strip a known image extension before appending the new one, so `hero.jpg` + PNG → `hero.png`.
- Empty name: Save button disabled.
- Save call fails: toast surfaces error; SaveAsDialog stays open.
- User cancels JPEG Options: returns to SaveAsDialog (does NOT close everything).
- `documentName` update on Save As to JPEG/PNG: should match the new name+extension. This matters for the next Save (Cmd+S) — if `documentName` ends in `.jpg`, Cmd+S should NOT silently re-download a JPEG; it should re-export to the same name. Detail: Cmd+S after a JPEG Save As re-runs the same JPEG export (Quality stays at 12 unless re-opened via Save As). This matches Photoshop where Save after Save As → JPEG re-saves JPEG.

---

## 2. Out-of-scope this tick (deferred)

- **PSD export.** Smart Objects and PSD parity are scope-excluded ([CLAUDE.md §4](../../CLAUDE.md)). No `.psd` in the Format list.
- **TIFF / GIF / BMP / WebP export.** Beyond the canonical JPEG/PNG/Photoshop Document set. WebP could be added later as a free win since `<canvas>.toBlob('image/webp', q)` is supported in most browsers; deferred to keep this tick small.
- **JPEG Options "Preview" checkbox + file-size readout.** Requires computing a JPEG blob at the current quality and decoding/displaying it; doable but adds non-trivial code. Divergence-logged.
- **"Apply to All" checkbox on Close All.** photoweb is single-document.
- **Home Screen on last close.** `home_screen` excluded; we already use the empty-state overlay.
- **Close and Go to Bridge.** Adobe Bridge excluded.
- **Tab × hover preview / mid-edit auto-commit.** F1's edge-case calls Close a no-op while in Free Transform; a future cluster could auto-commit the gesture before closing.
- **Save As "Save a Copy" checkbox.** Photoshop's "Save a Copy" sub-option creates a copy without changing the active doc's name. Not in either lesson; deferred.

## 3. Files to edit / files to create

**Create**
- `src/components/Dialogs/SaveAsDialog.tsx` — replaces the inline modal in App.tsx. Name + Format + Save/Cancel; opens JPEGOptionsDialog when format is JPEG. (F3)
- `src/components/Dialogs/JPEGOptionsDialog.tsx` — Quality (1–12) + Baseline radio + OK/Cancel. (F3)
- `src/components/Dialogs/CloseConfirmDialog.tsx` — `Don't Save` / `Cancel` / `Save`. (F1, F2)
- `src/utils/exportImage.ts` — `exportAsJpeg(layers, w, h, quality, baselineMode)`, `exportAsPng(layers, w, h)`. Flattens to a temp canvas, calls `toBlob`, downloads via anchor. (F3)
- `src/test/04c-file-save-close.test.tsx` — simulator-driven tests.

**Edit**
- `src/store/types.ts` — add `closeDocument()` action.
- `src/store/documentSlice.ts` — `closeDocument()` clears `layers`, `activeLayerId`, `documentName`, `isDirty`, `selection`, `width`/`height`. Also a `setDocumentName` already exists. (F1, F2)
- `src/App.tsx` — replace the inline Save As modal block with `<SaveAsDialog />`; add `<CloseConfirmDialog />`; wire Cmd+W + Cmd+Alt+W; pass open state for both.
- `src/components/layout/MenuBar.tsx` — add `Close` and `Close All` entries to File menu, gated on `layers.length > 0`.
- `src/components/layout/DocumentTab.tsx` — add leading × close button; remove the deferred-to-04c comment.

## 4. Test cases

All under `src/test/04c-file-save-close.test.tsx` (new file). Simulator-driven per CLAUDE.md §5.

**F1 — Close**
1. **Cmd+W on a clean doc closes it without prompting** — render App, ensure doc not dirty, fire Cmd+W, assert dialog NOT shown and `layers.length === 0`.
2. **Cmd+W on a dirty doc opens the save-on-close prompt** — mark dirty, fire Cmd+W, assert `CloseConfirmDialog` rendered with the doc name in its title.
3. **Save button on the prompt saves then closes** — spy on `saveFile`, click Save, assert spy called with current name and `layers.length === 0` after.
4. **Don't Save closes without saving** — spy on `saveFile`, click Don't Save, assert spy NOT called and `layers.length === 0`.
5. **Cancel button keeps the doc open** — click Cancel, assert dialog gone but `layers.length > 0` and `isDirty === true`.
6. **Esc cancels the prompt** — fire Esc key, assert dialog dismissed, doc untouched.
7. **Tab × on a dirty doc opens the same prompt** — click tab × button, assert prompt visible.

**F2 — Close All**
8. **Cmd+Alt+W on a clean doc closes it** — like #1 but with Alt modifier.
9. **Cmd+Alt+W on a dirty doc opens the same prompt** — like #2 but with Alt modifier.

**F3 — Save As**
10. **Save As dialog opens with Name + Format select + Save/Cancel** — assert all controls present.
11. **Choosing JPEG and clicking Save opens JPEG Options** — fire change on Format select, fire click on Save, assert JPEGOptionsDialog rendered.
12. **JPEG Options OK triggers blob download with selected quality** — spy on URL.createObjectURL and Blob constructor, set quality to 10, click OK, assert blob produced and anchor `download` filename has `.jpg`.
13. **PNG saves immediately without JPEG Options** — change Format to PNG, click Save, assert anchor `download` ends in `.png` and no JPEG Options dialog.
14. **Photoshop Document goes through saveFile** — change Format to Photoshop Document, click Save, spy on saveFile, assert called with the new name.
15. **Extension swap when name already has one** — type `hero.jpg`, pick PNG, click Save → download filename is `hero.png`.
16. **Empty name disables Save button** — clear name, assert Save button disabled.

## 5. Divergences from Photoshop

Append all to [divergence-log.md](../divergence-log.md).

- *Photoshop's Save As Format dropdown lists ~15 formats (Photoshop, JPEG, PNG, TIFF, GIF, BMP, EPS, PSB, …); photoweb's lists 3 (Photoshop Document `.pwbdoc`, JPEG, PNG)* because Smart Objects / PSD parity / print formats are scope-excluded ([CLAUDE.md §4](../../CLAUDE.md)). The canonical export formats for browser-based photo editing are covered.
- *Photoshop's "Photoshop Document" Save As writes a `.psd` file to disk; photoweb's "Photoshop Document" writes a `.pwbdoc` JSON manifest to OPFS* because the browser sandbox does not provide arbitrary disk writes and PSD parity is excluded. The internal format keeps layer information across save/load within photoweb's own document store.
- *Photoshop's JPEG Options has a Preview checkbox and a file-size readout; photoweb's omits both* because computing a preview requires encoding the JPEG twice and decoding it back to a thumbnail. Deferred; not load-bearing for the muscle-memory contract (the Quality slider and Baseline radios are what users actually adjust).
- *Photoshop opens the Home Screen after the last doc closes; photoweb leaves the existing empty-state overlay in place* because `home_screen` is excluded. The "Drop an image or use File > Open" overlay serves the same purpose.
- *Photoshop's Close All shows a per-doc prompt with an "Apply to All" checkbox; photoweb's Close All collapses to Close* because photoweb is single-document by [CLAUDE.md §4](../../CLAUDE.md) (`multi_doc_ui` excluded).
- *Photoshop shows a PSD Maximize Compatibility prompt when saving layered PSDs; photoweb does not* because PSD export is excluded.

## 6. Stop conditions specific to this cluster

- If `closeDocument()` cannot be cleanly added to the store because something invariant assumes `layers.length > 0` outside the existing empty-state guard, stop and write HUMAN-REVIEW.md — a deeper empty-state plumbing pass deserves its own scope decision.
- If the JPEG download path requires polyfills or fights node-canvas in the test harness, the JPEG Options dialog stays mounted but its OK-button download is best-effort with the assertion targeting the call to `URL.createObjectURL` rather than asserting on a real Blob's bytes.
- If converting the inline Save As block in App.tsx to a SaveAsDialog component reveals unexpected coupling (e.g. other call sites mutating `saveDialogOpen` directly), keep the original inline block as a wrapper and house the new logic in the component — do not refactor unrelated state.
