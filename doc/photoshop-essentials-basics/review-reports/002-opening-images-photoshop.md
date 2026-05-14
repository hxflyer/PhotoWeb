# 002 opening-images-photoshop
- Lesson path: `doc/photoshop-essentials-basics/opening-images-photoshop/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 04a-file-open-place

## Lesson Expectations
- Open images via File > Open, drag-and-drop, OS association, Adobe Bridge, Camera Raw, and Lightroom handoff.
- Close documents, including Close All.
- Screenshot `getting-images-into-photoshop-get-images-into-photoshop-fl-e5331a5f.jpg` frames the "getting images into Photoshop" workflow at a high level.

## Photoweb Coverage
- File menu exposes `Open...`, `Place Embedded...`, and `File > Scripts > Load Files into Stack...` (`src/components/layout/MenuBar.tsx:176`, `src/components/layout/MenuBar.tsx:177`, `src/components/layout/MenuBar.tsx:179`).
- Drag/drop and picker ingestion share `ingestFiles`, preserving order and skipping unsupported files (`src/utils/fileIngest.ts:2`, `src/utils/fileIngest.ts:55`, `src/test/04a-file-open-place.test.tsx:53`, `src/test/04a-file-open-place.test.tsx:97`).
- Close/Save As paths are covered in the file-save cluster tests (`src/test/04c-file-save-close.test.tsx:140`).

## Gaps / Mismatches
- Bridge, Camera Raw, Lightroom round-trip, and OS default editor setup are excluded by contract, not app gaps (`CLAUDE.md:135`, `CLAUDE.md:136`).
- Open-With / Camera Raw routing is already logged as a deliberate divergence (`doc/photoshop-essentials-basics/divergence-log.md:243`).

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
