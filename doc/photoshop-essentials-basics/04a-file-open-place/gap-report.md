# gap-report — 04a-file-open-place

## Lessons reviewed

- `opening-images-photoshop` — chapter index linking out to the other open/place lessons.
- `open-images-photoshop-cc` — File > Open (Ctrl/Cmd+O), Open With, Open Recent. Home Screen Open button + recent thumbnails. drag-and-drop onto Home Screen / blank workspace.
- `the-easy-way-to-open-or-add-images-in-photoshop` — drag-and-drop as the universal shortcut: drop on Home Screen / blank workspace → opens as new document; drop on existing doc → adds as layer (with Free Transform pre-armed); drop multiple files → each added as a layer (each going through Free Transform).
- `open-image-vs-place-image` — File > Open opens an image as its OWN document. File > Place Embedded inserts the image as a NEW LAYER in the already-open document, pre-arming Free Transform so the user can position/resize before committing with the Options Bar check mark.
- `open-multiple-images-as-layers-in-photoshop` — File > Scripts > Load Files into Stack opens a dialog (Browse to select files; checkbox "Attempt to Automatically Align Source Images"; checkbox "Create Smart Object after Loading Layers"). Each file becomes its own layer.

## Current photoweb coverage

- [src/components/Canvas/Viewport.tsx:1398-1455](src/components/Canvas/Viewport.tsx#L1398-L1455) — `handleDrop` accepts a single image or `.pwbdoc` file. **Rejects multi-file drops** with a toast. Always adds as a layer via `addLayerFromImage` (regardless of whether a document is open). No Free Transform pre-arm.
- [src/components/layout/MenuBar.tsx:148-151](src/components/layout/MenuBar.tsx#L148-L151) — File menu has `New…` (Cmd+N), `Open…` (Cmd+O), `Import Image…` (no shortcut). The "Import Image…" label is the photoweb equivalent of Photoshop's "Place Embedded".
- [src/App.tsx](src/App.tsx) wires `onOpenFile` and `onImportImage` to `<input type="file">` refs that open the OS file picker for single-image selection.
- No File > Scripts submenu; no Load Files into Stack equivalent.
- No Free Transform pre-arm after place / drop-as-layer.

## Gaps

| # | Gap | Where |
|---|---|---|
| 1 | Multi-file drop rejected with a toast. Photoshop accepts each file as a new layer. | [Viewport.tsx:1405-1408](src/components/Canvas/Viewport.tsx#L1405-L1408). |
| 2 | Dropping when no document exists yet always adds-as-layer onto an implicit empty doc. Photoshop opens the file as a NEW document. | [Viewport.tsx:1410-1448](src/components/Canvas/Viewport.tsx#L1410-L1448). |
| 3 | File menu reads `Import Image…` instead of Photoshop's `Place Embedded…`. The function is identical; the label isn't. | [MenuBar.tsx](src/components/layout/MenuBar.tsx). |
| 4 | No File > Scripts > Load Files into Stack… entry. | Same file. |
| 5 | Place / drop-as-layer doesn't pre-arm Free Transform. | Out of scope this tick — deferred (see §6). |

## Photoshop-habit mismatches

1. **Drop multiple files = multiple layers.** Grounded in `the-easy-way-to-open-or-add-images-in-photoshop/lesson.md:79-107`.
2. **Drop with no document open = new document.** Grounded in `…/lesson.md:46-49`.
3. **`Place Embedded…` is the exact menu label.** Grounded in `open-image-vs-place-image/lesson.md` and `the-easy-way-to-open-or-add-images-in-photoshop/lesson.md:53-58`.
4. **`File > Scripts > Load Files into Stack…` exact path.** Grounded in `open-multiple-images-as-layers-in-photoshop/lesson.md:81-86`.

## UI / UX issues separate from §4

- The "Open or drop an image to begin" placeholder at [Viewport.tsx:1566](src/components/Canvas/Viewport.tsx#L1566) appears when no document is mounted; behavior matches scope.

## Photoshop divergences worth keeping (or permanent)

- **No Home Screen** — `home_screen` excluded per CLAUDE.md §4. The "drop on Home Screen" interaction reduces to "drop on blank workspace" which we keep.
- **No Free Transform auto-arm on place / drop-as-layer** — defer; the existing place flow simply commits the layer at its native size at position (0,0). User can hit Cmd+T after to transform. Note as deferred.
- **No "Attempt to Automatically Align Source Images" / "Create Smart Object" options** in Load Files into Stack. Smart Objects are excluded per CLAUDE.md §4; auto-align is a sophisticated photo-merging feature that doesn't belong here. The dialog is simplified to a file picker with multi-select.
- **No Recent Files panel / Open Recent menu** — `home_screen` excluded.
- **No Open With / Camera Raw routing** — Camera Raw excluded per CLAUDE.md §4.
