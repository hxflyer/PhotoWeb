# 08c Document Transfer Gap Report

## Lessons Reviewed

- `5-ways-move-images-photoshop-documents` — Copy/Paste, Duplicate Layer with Destination, drag between tabs, drag in 2-up layout, and drag between floating windows.
- `moving-photos-between-documents` — Floating-window era versions of drag/drop, Duplicate Layer, and Select All + Copy/Paste.

## Current Photoweb Coverage

- Before this tick, Photoweb was effectively single-document: File > New/Open replaced the current layer stack.
- The app already had a document tab, File > Close, File > Open/New, Layers panel, active-layer duplication, and best-effort system clipboard image copy.
- Existing layer clone logic in [layersSlice.ts](../../../src/store/layersSlice.ts) could be adapted for cross-document transfers.

## Gaps

- There was no open-document collection, active-document switching, or multiple document tabs.
- `Layer > Duplicate Layer…` could only duplicate inside the active document and had no destination route.
- Copy/Paste depended on the browser clipboard and did not provide a dependable internal layer-transfer path.
- `Window > Arrange` had no document arrangement entries.
- Drag/drop between document tabs, true tiled viewports, and floating document windows were not available in the app shell.

## Photoshop-Habit Mismatches

- Photoshop users expect opening a second image to keep the first image open as its own document tab.
- Photoshop users expect Duplicate Layer to target another open document.
- Photoshop users expect Copy in one document and Paste in another to create a new layer in the destination.
- Photoshop users expect Window > Arrange > 2-up Vertical and Consolidate All to Tabs to exist while moving layers between documents.

## UI / UX Issues

- With only one active document, users could not follow the source lessons' tab-switching or destination-document workflows.
- The document tab label could not communicate multiple open documents.
- The Window menu offered panel visibility only, so document arrangement commands were undiscoverable.

## Photoshop Divergences Worth Keeping

- `2-up Vertical` is recorded as document layout state and exposed in the Window menu, but this tick does not render two simultaneous live viewports.
- Floating OS document windows are not implemented; browsers cannot create Photoshop-style detached document windows inside the app shell.
- Inactive tab close buttons switch to that tab first; closing remains the active-document command path so the existing save-on-close prompt is preserved.
