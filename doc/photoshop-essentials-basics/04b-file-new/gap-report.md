# 04b-file-new — Gap report

## 1. Lessons reviewed

- `create-new-documents-photoshop-cc` — File > New (Cmd+N) opens the New Document dialog. Category tabs (Recent / Saved / Photo / Print / Art & Illustration / Web / Mobile / Film & Video) gate preset thumbnails. The right-hand **Preset Details** pane has Untitled-N name + save icon, Width / Height / Orientation buttons / Artboards toggle, Resolution + unit, Color Mode / Bit Depth, Background Contents (White / Black / Background Color / Transparent / Custom + swatch), and an Advanced Options accordion. Saved presets live under the Saved tab with a trash icon on hover. Create / Close buttons bottom-right.
- `create-new-photoshop-document-same-size-as-open-document` — Trick: with a document open, Select > All → Edit > Copy populates the clipboard with the document's W/H/resolution. The very next File > New opens with those values **already prefilled** in the Width / Height / Resolution fields. No measurement, no transcribing.

## 2. Current photoweb coverage

**Dialog shell**
- [NewDocumentDialog.tsx:31-203](src/components/Dialogs/NewDocumentDialog.tsx#L31-L203) — flat preset list (left rail) + settings column. Width/Height/Resolution/Background fields. Cancel + Create buttons.
- [NewDocumentDialog.tsx:17-24](src/components/Dialogs/NewDocumentDialog.tsx#L17-L24) — six hard-coded presets (A4, Letter, 1920×1080, 1280×720, 800×600, Custom).
- [NewDocumentDialog.tsx:39](src/components/Dialogs/NewDocumentDialog.tsx#L39) — Background = `'white' | 'black' | 'transparent'` only.

**Invocation paths**
- `Cmd/Ctrl+N` → opens dialog ([App.tsx](src/App.tsx) keyboard handler; preserved from earlier clusters).
- File > New menu entry ([MenuBar.tsx](src/components/layout/MenuBar.tsx)).

**Store backing**
- [documentSlice.ts:262-296](src/store/documentSlice.ts#L262-L296) — `newDocument(w, h, bg)` allocates the Background layer, fills with bg color (string or `'transparent'`), enforces `MAX_DOC_PIXELS`.

## 3. Gaps

- **No clipboard autofill.** Lesson 2's "same size as open document" workflow has no equivalent in photoweb — there is no path from Edit > Copy → File > New that prefills the dimensions.
- **No category tabs.** The dialog is a flat list; the Recent / Saved structure Photoshop users expect is absent. Specifically:
  - No **Recent** memory of the last N created sizes.
  - No **Saved** presets — users cannot save a custom preset for later recall.
- **No Orientation toggle.** Lesson 1 image `02-opening-images-03-create-new-document-new-document-portrait-landscape-orientation-0a5cfc5a.png` shows two side-by-side Portrait/Landscape buttons next to the Height field. Swapping W↔H today requires retyping both numbers.
- **Background Contents missing Custom color.** Lesson 1 image `02-opening-images-03-create-new-document-more-background-color-choices-9e9622e9.png` shows White / Black / Background Color / Transparent / **Custom** with a small swatch preview to the right of the dropdown. photoweb's dropdown stops at three values and has no swatch.
- **No document name field.** Photoshop shows `Untitled-1` (incrementing) as a text input in Preset Details — it sets the created document's name. photoweb hard-codes the name to `'Untitled'` in [documentSlice.ts:283](src/store/documentSlice.ts#L283) with no UI control.
- **Editable Resolution missing.** photoweb forces a four-value dropdown (72/96/150/300). Photoshop offers a text input next to the unit selector so any integer is valid.

## 4. Photoshop-habit mismatches

Grounded screenshots are from `doc/photoshop-essentials-basics/create-new-documents-photoshop-cc/images/`.

- **Dialog layout** — Photoshop's dialog is **dual-pane** with the preset gallery on the *left/centre* and the right rail labelled **PRESET DETAILS** containing the name + form fields (`02-opening-images-03-create-new-document-photoshop-cc-new-document-dialog-cc3ddc6f.jpg`). photoweb places presets on the left rail but the right pane is a single column with no header label.
- **Category tabs across the top** — Recent / Saved / Photo / Print / Art & Illustration / Web / Mobile / Film & Video. Same screenshot. photoweb has no tabs.
- **Orientation pair** — two icons (person silhouette = portrait, landscape rectangle = landscape) inline with Height (`02-opening-images-03-create-new-document-new-document-portrait-landscape-orientation-0a5cfc5a.png`). Clicking the inactive one swaps W↔H. photoweb has none.
- **Background Contents dropdown** — five options with a swatch preview pill on the right (`02-opening-images-03-create-new-document-more-background-color-choices-9e9622e9.png`). photoweb only has 3 options and no swatch.
- **Untitled-N + save icon** — name input top of right rail with a small floppy/save icon on the far right that triggers the Save Preset flow (`02-opening-images-03-create-new-document-new-saved-document-preset-0e83f68e.png`). photoweb has neither.
- **Saved preset trash icon** — hovering a saved thumbnail reveals a trash icon in its top-right corner (`02-opening-images-03-create-new-document-delete-saved-preset-61995533.png`). photoweb has no saved presets at all.
- **Create button is bottom-right and primary; Close (not Cancel) is its left neighbour** — same dialog screenshot. photoweb already orders them right with Cancel/Create, but the secondary button text reads `Cancel` not `Close`.
- **Bottom strip — "Find more templates on Adobe Stock"** is excluded by [CLAUDE.md §4](../../CLAUDE.md) (`adobe_bridge`/Adobe ecosystem). Not a gap.

## 5. UI / UX issues

- **Preset list is text-only.** Photoshop presents preset thumbnails (rectangular tile with proportion preview + name). Even in our reduced-scope category set, a thumbnail tile communicates orientation/proportion at a glance better than a label row.
- **Resolution is a hard-coded `<select>` of 4 values.** Editing a preset's resolution at all is impossible; a numeric input is the Photoshop habit.
- **No keyboard activation on preset rows.** The flat list has only `onClick`; arrow keys do not move selection. Photoshop's preset thumbnails are focusable and arrow-keyed.
- **No `Enter` to Create.** The dialog has `useDialogA11y` for Esc-to-cancel and focus trap, but pressing `Enter` from an input does **not** trigger Create — only the input's commit handler runs (and `preventDefault`s).
- **Background swatch missing.** Even before adding Custom, the existing `White / Black / Transparent` could show a small color chip beside the select so the result is previewed.

## 6. Photoshop divergences worth keeping

- **No Color Mode / Bit Depth / Color Profile controls.** sRGB end-to-end is fixed scope ([CLAUDE.md §4](../../CLAUDE.md) — `color_management`). Existing divergence (Phase 0).
- **No Artboards toggle.** Artboards are not in photoweb's scope.
- **No Advanced Options (Pixel Aspect Ratio).** Out of scope; print/video-specific.
- **No Home Screen "Create New" entry point.** [CLAUDE.md §4](../../CLAUDE.md) excludes `home_screen`. File > New / Cmd+N remain the only paths.
- **No Adobe Stock template strip at the bottom of the dialog.** Adobe ecosystem; excluded.
- **No Legacy New Document Dialog Preferences toggle.** [CLAUDE.md §4](../../CLAUDE.md) excludes `legacy_ui`.
- **Pixels-only units (no inches/cm/mm).** Existing divergence — photoweb stores in pixels; resolution is metadata that does not drive unit conversion in any current dialog. Will revisit if a print-output cluster ever lands (it won't under current scope).
