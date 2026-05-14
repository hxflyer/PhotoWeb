# 100 resize-image-match-another-photoshop
- Lesson path: `doc/photoshop-essentials-basics/resize-image-match-another-photoshop/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `05a-image-size`

## Lesson Expectations
- With Image Size open, choose another open document from the Window menu; Width and Height update to match that document (`cc-resize-images-to-match-choose-small-image-window-menu-photoshop-3a360398.png`, `cc-resize-images-to-match-match-image-sizes-photoshop-d7daf04c.jpg`).
- Requires multiple document tabs and Image Size dialog interaction.

## Photoweb Coverage
- Multiple documents and tabs exist, including duplicate-layer-to-document and document switching tests (`src/test/08c-doc-transfer.test.tsx:55`, `src/store/documentSlice.ts:657`).
- Image Size dialog supports direct width/height edits and Fit To presets (`src/components/Dialogs/ImageSizeDialog.tsx:356`).

## Gaps / Mismatches
- No Window-menu document list integration while Image Size is open was found.
- Multi-document UI is limited by accepted divergence; however this particular command could still use Photoweb's existing document list.

## Scope Decision
Needs product decision: useful Photoshop habit, but it crosses the single-viewport/multi-document boundary.

## Recommended Follow-up
Consider adding "Fit To: <open document names>" inside Image Size as a browser-friendly equivalent.
