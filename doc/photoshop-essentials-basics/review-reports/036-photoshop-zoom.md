# 036 photoshop-zoom
- Lesson path: `doc/photoshop-essentials-basics/photoshop-zoom/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 03-navigation

## Lesson Expectations
- Current zoom in document tab/status bar, edit zoom percent, scrubby status slider, View > Zoom In/Out/Fit on Screen/100%, Zoom Tool click/Alt-click/continuous/scrubby/selection-box zoom, pixel grid beyond 100%, and temporary Z.
- Screenshots include `2022-zoom-and-pan-images-current-zoom-level-in-document-tab-d8d4eb3b.png`, `2022-zoom-and-pan-images-enter-new-zoom-level-e3e7b645.png`, and `2022-zoom-and-pan-images-photoshop-zoom-in-out-command-shortcuts-a5d648f5.png`.

## Photoweb Coverage
- Document tab and status bar display current zoom (`src/components/layout/DocumentTab.tsx:113`, `src/components/layout/StatusBar.tsx:312`).
- Status bar zoom entry supports click-to-edit and Cmd/Ctrl drag scrub (`src/components/layout/StatusBar.tsx:70`, `src/test/03-navigation.test.tsx:102`).
- Zoom Tool click, Alt-click, and scrubby drag are tested (`src/test/03-navigation.test.tsx:64`, `src/test/03-navigation.test.tsx:73`, `src/test/03-navigation.test.tsx:81`).

## Gaps / Mismatches
- `Fit on Screen` controls currently set zoom/pan to 100% instead of computing a fit-to-viewport scale (`src/components/Panels/OptionsBar.tsx:2403`, `src/components/Panels/OptionsBar.tsx:2424`, `src/components/layout/MenuBar.tsx:632`).
- Pixel Grid and selection-box zoom were not found in the focused rg pass.

## Scope Decision
Fix

## Recommended Follow-up
Implement real Fit on Screen and decide whether Pixel Grid / drag-selection zoom are needed for Photoshop-habit fidelity.
