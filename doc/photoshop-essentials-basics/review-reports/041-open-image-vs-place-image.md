# 041 open-image-vs-place-image
- Lesson path: `doc/photoshop-essentials-basics/open-image-vs-place-image/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 04a-file-open-place

## Lesson Expectations
- File > Open creates separate documents; File > Place Embedded adds the image into the active document as a placed Smart Object layer; then blend mode and opacity can composite the placed image.
- Screenshots include `2021-open-image-vs-place-image-file-open-7dbacab2.png`, `2021-open-image-vs-place-image-place-embeded-197fe497.png`, and `2021-open-image-vs-place-image-select-place-embedded-70472309.png`.

## Photoweb Coverage
- File menu exposes Open and Place Embedded (`src/components/layout/MenuBar.tsx:176`, `src/components/layout/MenuBar.tsx:177`).
- Ingest pipeline opens the first image or adds picked/dropped images as layers (`src/utils/fileIngest.ts:55`, `src/test/04a-file-open-place.test.tsx:120`, `src/test/04a-file-open-place.test.tsx:128`).
- Blend mode and opacity workflows exist for compositing placed layers (`src/test/09-blend-modes.test.tsx:83`, `src/components/Panels/LayersPanel.tsx`).
- Load Files into Stack omits Smart Object options by accepted divergence (`doc/photoshop-essentials-basics/divergence-log.md:237`).

## Gaps / Mismatches
- Place Embedded creates an ordinary raster layer, not a Smart Object/placed layer, because Smart Objects are excluded (`CLAUDE.md:138`).
- The lesson's separate-document comparison overlaps multi-document UI; photoweb keeps only limited document handling.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
