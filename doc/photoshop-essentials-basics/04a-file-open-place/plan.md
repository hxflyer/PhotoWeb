# plan — 04a-file-open-place

Three Feature specs. Free-Transform-auto-arm is deferred to a follow-up.

---

## 1. Goals

### 1.1 Feature spec — Multi-file drag-and-drop

**What it does.** Dropping multiple files onto the canvas (or onto the empty workspace) adds each as its own layer in the active document. Order matches the OS's file-selection order. If no document is open, the first file opens AS a new document and the remaining files are added as layers on top.

**Photoshop habit preserved.** Drop N files → N layers. Grounded in `the-easy-way-to-open-or-add-images-in-photoshop/lesson.md:79-110`. `.pwbdoc` files are photoweb-native and not stackable, so dropping >1 `.pwbdoc` is rejected.

**Invocation.** OS-level drag-and-drop onto the canvas / workspace.

**Pre-conditions.** Browser supports File API drag-and-drop (universal).

**Interaction choreography.**
1. User selects N images in Finder / Explorer, drags them onto the canvas.
2. Each file is read (FileReader.readAsDataURL → Image element).
3. **No document open** (no layers): the first image becomes the document via `openImageAsDocument`; subsequent images add as layers via `addLayerFromImage`.
4. **Document open**: every image adds as a layer via `addLayerFromImage`, preserving drop order.
5. After all files are processed, a single toast: `Added N images` (or `Opened "<first>" + added N-1 layers`).
6. Mixing `.pwbdoc` with images in a single drop → reject with `Can't mix .pwbdoc files with images`.
7. Multiple `.pwbdoc` files in a drop → reject (only one document at a time).

**Visual feedback.** Single toast at the end. No per-file toast spam.

**Post-conditions.** N layers in the Layers panel; the LAST-added layer is the active layer.

**Edge cases.**
- A file fails to load (corrupted image): show one toast per failure, continue with the others.
- Mixed file types (e.g. one image + one PDF): non-image files are skipped with a toast.
- 0 files in the drop: no-op.

---

### 1.2 Feature spec — Drop on empty workspace opens as new document

**What it does.** When no document is loaded and the user drops a single image, the file opens as a new Photoshop document (matches Photoshop's drop-on-Home-Screen behavior; we have no Home Screen but the same intent applies on the blank workspace).

**Photoshop habit preserved.** Grounded in `the-easy-way-to-open-or-add-images-in-photoshop/lesson.md:46-49`.

**Invocation.** Single image drop while `layers.length === 0`.

**Pre-conditions.** Document state is empty (no layers).

**Interaction choreography.**
1. User drops `photo.jpg` onto the empty workspace.
2. Browser fires `drop` event; handler reads the file.
3. `openImageAsDocument(img, "photo.jpg")` runs: creates document at the image's pixel dimensions, sets one layer to the image.
4. Toast: `Opened "photo.jpg"`.

**Visual feedback.** Document tab updates to show the new filename; canvas redraws with the image fit-to-screen.

**Post-conditions.** Document state matches a fresh File > Open.

**Edge cases.**
- The document state has the synthetic empty Background layer (from `newDocument`): this still counts as a non-empty document and the file adds as a layer, not as a new doc. This is acceptable — once the user creates a New Document, drop-as-layer is the right behavior.
- Detection of "no document": `layers.length === 0`. The newDocument flow creates 1 layer, so empty state is genuinely empty.

---

### 1.3 Feature spec — `File > Place Embedded…` + `File > Scripts > Load Files into Stack…`

**What it does.** Renames the existing `File > Import Image…` menu entry to `Place Embedded…` (matching Photoshop's exact label; function unchanged — opens single-file picker and adds as layer). Adds a new `File > Scripts` submenu with `Load Files into Stack…` (opens a multi-select file picker; each chosen file becomes a layer; matches Photoshop's flow minus the Smart-Object and auto-align options).

**Photoshop habit preserved.** Exact menu paths and labels. Grounded in `open-image-vs-place-image/lesson.md` and `open-multiple-images-as-layers-in-photoshop/lesson.md:81-86`.

**Invocation.**
- `File > Place Embedded…` → OS file picker (single).
- `File > Scripts > Load Files into Stack…` → OS file picker (multi).

**Pre-conditions.** None.

**Interaction choreography.**
1. User clicks `File > Place Embedded…`. OS file picker opens (single-select).
2. User picks `image.jpg`. Layer added at native size, position (0, 0). Toast: `Placed "image.jpg"`.
3. User clicks `File > Scripts > Load Files into Stack…`. OS file picker opens with `multiple` attribute.
4. User picks 3 files. Each added as a layer in selection order. Toast: `Loaded 3 files as layers`.

**Visual feedback.** Standard file picker UI. After: new layers in the Layers panel.

**Post-conditions.** Layers panel shows the added layers.

**Edge cases.**
- User cancels the picker → no-op, no toast.
- Picker returns 0 files → no-op.
- Non-image files in the multi-select → skip with a single toast `Skipped N non-image files`.
- Load Files into Stack when no document is open: open the first as a new document, add the rest as layers (same as multi-file drop).

---

## 2. Out-of-scope-this-tick

- **Free Transform auto-arm after place / drop-as-layer.** Photoshop pre-arms Free Transform so users can resize the placed image before committing with the Options Bar check mark. This requires wiring the existing Free Transform flow to a custom-event trigger and handling the multi-file case (auto-commit between files). Defer to a polish follow-up.
- **Home Screen, Recent Files, Open Recent** — excluded per CLAUDE.md §4.
- **Open With → Camera Raw routing** — excluded per CLAUDE.md §4 (`camera_raw`).
- **Load Files into Stack: "Attempt to Automatically Align Source Images" + "Create Smart Object after Loading Layers"** — Smart Objects excluded per CLAUDE.md §4; auto-align is a complex photo-merging algorithm out of scope.

## 3. Files to edit / create

| Concern | Files |
|---|---|
| Drop handler | edit [src/components/Canvas/Viewport.tsx](src/components/Canvas/Viewport.tsx) (multi-file + empty-state branch). |
| Menu | edit [src/components/layout/MenuBar.tsx](src/components/layout/MenuBar.tsx) (rename + add submenu). |
| App glue | edit [src/App.tsx](src/App.tsx) — add a `loadFilesIntoStack` handler that opens a multi-select picker, wires to the same per-file ingest used by the drop handler. |
| Tests | **new** `src/test/04a-file-open-place.test.tsx`. |

4 files (1 new). Under stop bar.

## 4. Test cases

- **Multi-file drop adds each as a layer** — simulate `drop` with 3 image files; assert 3 calls to `addLayerFromImage` (or 1 `openImageAsDocument` + 2 `addLayerFromImage` when starting from empty).
- **Drop on empty workspace opens as new doc** — empty state, drop 1 image, assert `openImageAsDocument` was called.
- **Drop on existing doc adds as layer** — 1 image already present, drop 1 new image, assert `addLayerFromImage` was called once.
- **Multiple `.pwbdoc` files in a drop** — rejected with a single toast.
- **Mixed `.pwbdoc` + image** — rejected with a single toast.
- **Place Embedded menu label** — render MenuBar, open File menu, assert "Place Embedded…" is present and "Import Image…" is not.
- **File > Scripts > Load Files into Stack…** — present and reachable.

(The OS file-picker flow is hard to drive without faking `<input type="file">`; we test the menu wiring and the per-file ingest path that the picker would call.)

## 5. Divergences from Photoshop

1. **No Free Transform auto-arm** after place / drop-as-layer. *Convenience polish deferred.*
2. **No Home Screen / Recent Files** — drop on blank workspace works. *Scope (CLAUDE.md §4).*
3. **No auto-align / Smart-Object options** in Load Files into Stack. *Scope (CLAUDE.md §4).*
4. **No Open With / Camera Raw** — opens go through native browser file picker. *Scope (CLAUDE.md §4).*

## 6. Stop conditions specific to this cluster

- Stop if multi-file drop triggers race-condition issues — `addLayerFromImage` is called sequentially from each `img.onload`, so order depends on `Promise.all` over `FileReader.onload`s. Use an explicit async loop, not parallel.
- Stop if `openImageAsDocument` doesn't exist for the no-doc branch — already in `documentSlice.ts` per CLAUDE.md §3.
