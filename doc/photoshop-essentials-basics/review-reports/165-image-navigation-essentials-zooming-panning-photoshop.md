# 165 image-navigation-essentials-zooming-panning-photoshop
- Lesson path: `doc/photoshop-essentials-basics/image-navigation-essentials-zooming-panning-photoshop/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `03-navigation`

## Lesson Expectations
- Zoom level appears in the document tab and bottom-left status area; examples are grounded by `2022-zoom-and-pan-images-current-zoom-level-in-document-tab-d8d4eb3b.png` and `2022-zoom-and-pan-images-current-zoom-level-bottom-left-corner-8e24fafc.png`.
- Users can type a zoom percent, scrub the bottom-left value with Ctrl/Cmd-drag, use View > Zoom In/Out, Ctrl/Cmd+plus/minus, Fit on Screen, 100%, and the Zoom Tool.
- Zoom Tool click zooms in, Alt/Option-click zooms out, scrubby zoom drags horizontally, and Hand Tool/Spacebar pans.

## Photoweb Coverage
- Document tab shows name and zoom percent in `src/components/layout/DocumentTab.tsx:23`.
- Status bar has editable zoom percent and Cmd/Ctrl-drag scrubby zoom in `src/components/layout/StatusBar.tsx:70`.
- Menu and keyboard commands cover Zoom In/Out, Fit on Screen, and 100% in `src/components/layout/MenuBar.tsx:630` and `src/App.tsx:576`.
- Zoom and Hand tools are implemented in `src/tools/handZoom.ts:57`; tests cover zoom-at-point, scrubby threshold, status-bar entry, and Alt-click in `src/test/03-navigation.test.tsx:64`.

## Gaps / Mismatches
- Status-bar scrubby zoom does not implement the lesson's Shift-for-10% increment behavior.
- Zoom/Hand Options Bar `Fit Screen` buttons set `zoom=1` and/or pan to zero instead of using the viewport-fit helper, unlike the menu and Ctrl/Cmd+0 path (`src/components/Panels/OptionsBar.tsx:2403`, `src/components/Panels/OptionsBar.tsx:2425`).

## Scope Decision
Fix.

## Recommended Follow-up
Route all Fit Screen controls through `requestViewportFit()` and add Shift-step behavior/tests for the bottom-left scrubby zoom.
