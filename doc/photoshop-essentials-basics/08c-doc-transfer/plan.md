# 08c Document Transfer Plan

## Goals

### Feature 1 — Open Document Collection

**What it does** — Adds an open-document record list, active document id, tab switching, and active-document close behavior that falls back to another open document when available.

**Photoshop habit preserved** — Opening or creating another document keeps the first document available as a tab.

**Invocation** — File > New/Open, document tab clicks, File > Close.

**Post-conditions** — Active layer stack, dimensions, resolution, selection, and document name swap when a tab is selected.

### Feature 2 — Duplicate Layer To Destination

**What it does** — Adds a destination-aware layer duplication command and exposes open documents under `Layer > Duplicate Layer…`.

**Photoshop habit preserved** — A layer from the active document can be duplicated directly into another open document.

**Invocation** — `Layer > Duplicate Layer… > <document name>`.

**Post-conditions** — Destination document receives a copied layer and becomes dirty; switching to it shows the new layer.

### Feature 3 — Internal Copy / Paste Transfer

**What it does** — `Copy` captures the active layer into an internal transfer clipboard in addition to the existing best-effort image clipboard; `Paste` creates a new layer from that transfer clipboard.

**Photoshop habit preserved** — Copy in one document, switch documents, Paste to add the copied image/layer above the destination.

**Invocation** — Edit > Copy/Paste or Cmd/Ctrl+C / Cmd/Ctrl+V.

**Post-conditions** — Destination document receives the copied layer as an undoable paste.

### Feature 4 — Arrange Menu State

**What it does** — Adds Window > Arrange entries for Consolidate All to Tabs, 2-up Vertical, and Float All in Windows.

**Photoshop habit preserved** — The source lessons' Window > Arrange commands are visible and stateful.

**Post-conditions** — `documentLayout` records the chosen layout.

## Out Of Scope This Tick

- Full simultaneous multi-viewport rendering for 2-up Vertical.
- Dragging layer pixels between live document viewports.
- True floating OS document windows.
- Paste Special modes.

## Files To Edit / Files To Create

- `src/store/types.ts`
- `src/store/documentSlice.ts`
- `src/components/layout/DocumentTab.tsx`
- `src/components/layout/MenuBar.tsx`
- `src/App.tsx`
- `src/test/08c-doc-transfer.test.tsx`
- `doc/photoshop-essentials-basics/08c-doc-transfer/gap-report.md`
- `doc/photoshop-essentials-basics/08c-doc-transfer/plan.md`

## Test Cases

- Multiple new documents appear in the open-document list and can be switched through tabs.
- Duplicate Layer to another document inserts a copied layer into that destination.
- Copy in one document and Paste in another creates a layer with the copied pixels.
- Window Arrange state switches between tabs and 2-up Vertical.

## Divergences From Photoshop

- 2-up Vertical is state/menu support only for now, not simultaneous live viewports.
- Floating windows are represented by the same in-app arrangement state.
- Inactive tab close buttons switch first; the existing active-document close flow handles save prompts.

## Stop Conditions

- Stop if close/save behavior regresses, if opening a new document loses the previous document, or if copy/paste bypasses undo in the destination.
