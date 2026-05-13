# 04c-file-save-close — Gap report

## 1. Lessons reviewed

- `how-to-avoid-losing-your-original-images-in-photoshop` — Strategies to protect originals: **File > Save As** with a new name or different format (JPEG → PSD) before editing, work on a separate layer, use Adjustment Layers. JPEG Options dialog appears on JPEG save (Quality 1–12, Baseline Standard / Baseline Optimized / Progressive, Matte, Preview, file-size readout). PSD save shows the Maximize Compatibility prompt.
- `close-images-photoshop` — **File > Close** (Cmd/Ctrl+W) closes the active document; the **×** in the document tab does the same. **File > Close All** (Cmd/Ctrl+Alt+W) closes every open doc. If a doc has unsaved changes (asterisk after filename in the tab), Photoshop opens an OS-native modal: *"Save changes to the Adobe Photoshop document '...' before closing?"* with `Don't Save` / `Cancel` / `Save`. Close All shows an extra **Apply to All** checkbox so one choice closes the whole stack. Closing the last doc returns to the Home Screen.

## 2. Current photoweb coverage

**Save**
- [MenuBar.tsx:158-161](src/components/layout/MenuBar.tsx#L158-L161) — File > Save (⌘S) calls `saveFile(documentName)` which writes a `.pwbdoc` to OPFS/localStorage.
- [MenuBar.tsx:162](src/components/layout/MenuBar.tsx#L162) — File > Save As… (⌘⇧S) routes to a minimal inline dialog in App.tsx.
- [App.tsx:912-927](src/App.tsx#L912-L927) — Save As inline modal: name input + Save/Cancel only. No format selector, no JPEG Options, no extension awareness.
- [App.tsx:368-374](src/App.tsx#L368-L374) — Cmd+S / Cmd+Shift+S keyboard wiring.
- [documentSlice.ts:346-354](src/store/documentSlice.ts#L346-L354) — `saveFile(name)` / `loadFile(name)` async actions; both set `isDirty: false` on success.
- [persistence.ts:164-243](src/core/persistence.ts#L164-L243) — JSON manifest written to `.pwbdoc` with OPFS-first / localStorage-fallback.

**Dirty tracking**
- [documentSlice.ts:341-344](src/store/documentSlice.ts#L341-L344) — `markDocumentDirty` / `markDocumentClean`.
- [DocumentTab.tsx:53-61](src/components/layout/DocumentTab.tsx#L53-L61) — trailing `*` shown when `isDirty`.
- [DocumentTab.tsx:8-10](src/components/layout/DocumentTab.tsx#L8-L10) — explicit comment: tab `×` close button "intentionally omitted in this tick: File > Close with a save-changes-or-discard prompt lives in cluster 04c-file-save-close." (← that's us.)

**Close**
- **None.** No File > Close menu entry, no Cmd+W binding, no Cmd+Alt+W. Cmd+Shift+Alt+W is taken by Export ([App.tsx:377](src/App.tsx#L377)).
- The DocumentTab has no `×`.
- Closing the document is impossible from inside the app today — the user can only replace the doc via File > New / File > Open.

**Empty-state handling**
- [Viewport.tsx:1514-1531](src/components/Canvas/Viewport.tsx#L1514-L1531) — already renders an "Open or drop an image to begin" overlay when `layers.length === 0`. So a Close implementation can safely zero out the layer list without painting visual junk.
- [App.tsx:262-266](src/App.tsx#L262-L266) — boot path adds a default layer if none exist. We must NOT re-trigger this after a user-initiated Close (or Close → boot would re-create a layer).

## 3. Gaps

- **No File > Close / Cmd+W.** Core Photoshop habit absent.
- **No File > Close All / Cmd+Alt+W.** Single-document scope makes this functionally identical to Close, but the menu entry + hotkey are habit-load-bearing.
- **No save-on-close confirmation dialog.** Photoshop's three-button modal (`Don't Save` / `Cancel` / `Save`) does not exist; the user has no chance to rescue unsaved work — but since Close itself is missing, this gap is paired with #1.
- **No tab × close button.** [DocumentTab.tsx:8-10](src/components/layout/DocumentTab.tsx#L8-L10) explicitly defers it to this cluster.
- **Save As doesn't honour formats.** Photoshop's Save As is a Format selector (Photoshop / JPEG / PNG / TIFF / GIF / …) that drives subsequent dialogs (JPEG Options, PSD compatibility). photoweb's Save As is a name-only field with no format awareness; the only supported format is `.pwbdoc` (our internal JSON), and PNG export is reached only via Quick Export / Export As. A Photoshop user who picks "Save As → JPEG" finds no equivalent path.
- **No JPEG Options dialog.** Quick Export / Export As exists but neither presents the Quality + Baseline / Progressive choices. Save As to JPEG is the canonical path; we don't have it.
- **No "Apply to All" multi-doc Close All path.** Photoweb is single-document by CLAUDE.md §4 (`multi_doc_ui` excluded), so Close All collapses to Close. The hotkey + menu entry still need to exist for muscle memory; the multi-doc dialog enhancement does not.

## 4. Photoshop-habit mismatches

Grounded screenshots from `doc/photoshop-essentials-basics/close-images-photoshop/images/` and `doc/photoshop-essentials-basics/how-to-avoid-losing-your-original-images-in-photoshop/images/`.

- **Cmd/Ctrl+W = Close, Cmd/Ctrl+Alt+W = Close All.** Lesson `close-images-photoshop` lines 25, 37. photoweb leaves these slots empty (and worse, photoweb's Cmd+Shift+Alt+W is currently bound to "Export As…", which is a non-standard Photoshop binding — but that's not strictly a habit-mismatch for Cmd+W).
- **× appears in the document tab.** Lesson screenshot `interface-close-images-photoshop-close-image-document-tab-df59cd1e.png` shows the `×` after the filename on Windows (and to the left of it on macOS — we match macOS aesthetic by leading the tab with × per the lesson).
- **Confirmation modal title and button labels.** Lesson screenshot `interface-close-images-photoshop-save-before-closing-4824ceee.png`: title is "Save changes to the Adobe Photoshop document '<name>' before closing?" and the three buttons are `Don't Save` (left), `Cancel` (middle), `Save` (right). photoweb's existing inline Save As dialog uses `Cancel` / `Save`; we should match the Photoshop labels and button order here.
- **Save As Format selector + JPEG Options.** Lesson `how-to-avoid-losing-your-original-images-in-photoshop` screenshots `cc-avoid-losing-originals-save-as-copy-8fd6cb4d.png` (Save As dialog) and `cc-avoid-losing-originals-jpeg-options-photoshop-cf6742de.png` (JPEG Options). The Format dropdown is part of the user's muscle memory ("Save As → change Format → Photoshop / JPEG"). photoweb's `Save As` lacks it entirely.
- **PSD Maximize Compatibility dialog.** Same lesson, screenshot `cc-avoid-losing-originals-maximize-compatibility-f104a7eb.png`. This is a side-effect of PSD save with layered content. photoweb does not save PSD (and won't — Smart Objects and PSD parity are scope-excluded), so the dialog has no equivalent. Recorded as a divergence we keep.

## 5. UI / UX issues

- **Inline Save As dialog isn't grouped with the other modals.** [App.tsx:912-927](src/App.tsx#L912-L927) inlines its own styling; a `SaveAsDialog` component aligned with `NewDocumentDialog` and friends would be cleaner. Worth promoting at the same time as adding the Format selector.
- **No Enter-to-confirm on the close-changes prompt** (because it doesn't exist yet) — when we ship it, default-focus the `Save` button per the Photoshop screenshot's blue highlight.
- **The DocumentTab does not double-click to rename** — Photoshop allows renaming via the title, but lessons don't cover that for this cluster. Out of scope, noted only.

## 6. Photoshop divergences worth keeping

- **No Home Screen on last close.** [CLAUDE.md §4](../../CLAUDE.md) excludes `home_screen`. The empty viewport overlay at [Viewport.tsx:1514-1531](src/components/Canvas/Viewport.tsx#L1514-L1531) is the photoweb equivalent.
- **No "Close and Go to Bridge".** Adobe Bridge is excluded (`adobe_bridge`).
- **Save As Format list omits PSD / TIFF.** Smart Objects and PSD parity are scope-excluded. Format choices in photoweb will be Photoshop Document (`.pwbdoc`, our internal JSON) + JPEG + PNG only. No TIFF, no GIF, no BMP — those wouldn't change the muscle-memory contract because users almost always reach for JPEG or PSD.
- **No PSD Maximize Compatibility prompt.** No PSD export at all; nothing to gate.
- **Close All collapses to Close.** photoweb is single-document; the hotkey and menu entry exist but no "Apply to All" checkbox machinery — the prompt is the single-doc one.
