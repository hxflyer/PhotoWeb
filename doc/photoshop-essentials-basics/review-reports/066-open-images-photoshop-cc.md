# 066 open-images-photoshop-cc
- Lesson path: `doc/photoshop-essentials-basics/open-images-photoshop-cc/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 04a-file-open-place

## Lesson Expectations
- Home Screen recent thumbnails and Open button; File > Open / `Ctrl/Cmd+O`; close via File > Close.
- Opening a second image from Home Screen creates another document tab in Photoshop; raw files route to Camera Raw.
- Screenshots grounding UI: `02-opening-images-04-open-images-photoshop-cc-home-screen-recent-32d2ea65.jpg`, `02-opening-images-04-open-images-photoshop-home-screen-open-image-7f8a5afa.png`, `02-opening-images-04-open-images-image-opens-in-photoshop-fd830ee8.jpg`, `02-opening-images-04-open-images-close-command-photoshop-33349b85.png`.

## Photoweb Coverage
- File menu exposes Open with `⌘O`, Close, and Close All in `src/components/layout/MenuBar.tsx:175` and `src/components/layout/MenuBar.tsx:182`.
- App file input opens selected image as a document in `src/App.tsx:914`.
- Ingest path handles image drops and `.pwbdoc` opens in `src/utils/fileIngest.ts:59`.
- Close behavior is tested in `src/test/04c-file-save-close.test.tsx:46`.

## Gaps / Mismatches
- Home Screen and recent files are explicitly excluded; Photoweb uses an in-canvas empty state instead.
- Camera Raw is excluded.
- Multi-document UI is explicitly excluded in CLAUDE.md, though some open-document state exists internally; reports should treat Photoshop second-tab behavior as out of scope.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.

