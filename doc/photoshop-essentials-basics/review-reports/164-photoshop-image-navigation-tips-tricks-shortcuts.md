# 164 photoshop-image-navigation-tips-tricks-shortcuts
- Lesson path: `doc/photoshop-essentials-basics/photoshop-image-navigation-tips-tricks-shortcuts/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `03-navigation`

## Lesson Expectations
- Shows current zoom in the document tab/status area, allows clicking and typing a zoom percentage, Enter to accept and Esc to cancel.
- Supports scrubby zoom on the percentage field, Shift for 10% increments, View > Zoom In/Out, `Cmd/Ctrl++`, `Cmd/Ctrl+-`, Fit on Screen `Cmd/Ctrl+0`, and 100% `Cmd/Ctrl+1`.
- Uses Zoom Tool `Z`, `Alt/Option` zoom out, continuous/scrubby zoom, drag-rectangle zoom, mouse wheel, Hand Tool `H`, temporary Spacebar hand, flick panning, and scrollbars.
- Grounding screenshots include `2022-zoom-and-pan-images-current-zoom-level-bottom-left-corner-8e24fafc.png`, `2022-zoom-and-pan-images-enter-new-zoom-level-e3e7b645.png`, `2022-zoom-and-pan-images-zoom-scrubby-slider-c695d1d5.png`, `2022-zoom-and-pan-images-photoshop-fit-on-screen-command-b5f2f8b6.png`, and `2022-zoom-and-pan-images-photoshop-100percent-view-command-822b17a5.png`.

## Photoweb Coverage
- `src/store/viewSlice.ts:126` handles zoom and pan state.
- `src/tools/handZoom.ts:6` implements the Hand tool; `src/tools/handZoom.ts:26` implements zoom-at-point and scrubby zoom; `src/tools/handZoom.ts:57` implements Zoom Tool click, `Alt/Option` zoom out, and scrubby behavior.
- `src/components/layout/StatusBar.tsx:69` displays zoom, `src/components/layout/StatusBar.tsx:79` commits typed zoom, and `src/components/layout/StatusBar.tsx:91` implements status-bar scrubby zoom.
- `src/components/Canvas/Viewport.tsx:294` fits the document to the viewport.
- `src/test/03-navigation.test.tsx:40` covers zoom at point, `src/test/03-navigation.test.tsx:64` covers Zoom Tool click/scrubby, and `src/test/03-navigation.test.tsx:102` covers status zoom typing.

## Gaps / Mismatches
- Shift-modified scrubby zoom increments were not found in the status-bar implementation.
- Drag-rectangle zoom, scroll-wheel zoom/pan, flick panning, scrollbars, and complete View menu shortcut parity need verification or are missing.
- The app target excludes nav extras, so some Photoshop navigation trivia may be intentionally omitted.

## Scope Decision
Fix

## Recommended Follow-up
Tighten the navigation contract: implement/test only the Photoshop-fluent essentials, especially Shift scrubby increments, `Cmd/Ctrl+0`, `Cmd/Ctrl+1`, zoom in/out shortcuts, Spacebar hand, and any chosen drag-zoom behavior.
