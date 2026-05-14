# 127 close-images-photoshop
- Lesson path: `doc/photoshop-essentials-basics/close-images-photoshop/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `04c-file-save-close`

## Lesson Expectations
- Close the active document from File > Close, `Ctrl/Cmd+W`, or the document tab close button.
- Close All via File > Close All and `Ctrl/Cmd+Alt/Option+W`.
- Dirty documents show an asterisk in the tab and trigger Save / Don't Save / Cancel.
- Multiple dirty documents can use Apply to All in Photoshop; Close and Go to Bridge is an Adobe Bridge path.
- Grounding screenshots include `interface-close-images-photoshop-file-close-307c1adb.png`, `interface-close-images-photoshop-close-image-document-tab-df59cd1e.png`, `interface-close-images-photoshop-save-before-closing-4824ceee.png`, and `interface-close-images-photoshop-close-images-apply-all-4be8f733.png`.

## Photoweb Coverage
- `src/App.tsx:493` handles `Cmd/Ctrl+N`, `Cmd/Ctrl+O`, `Cmd/Ctrl+S`, `Cmd/Ctrl+Shift+S`, `Cmd/Ctrl+W`, and `Cmd/Ctrl+Alt/Option+W`.
- `src/components/layout/DocumentTab.tsx:73` provides the tab close button, and `src/components/layout/DocumentTab.tsx:111` shows zoom/RGB/8 plus a dirty asterisk.
- `src/components/Dialogs/CloseConfirmDialog.tsx:52` implements Don't Save, Cancel, and Save actions, with keyboard handling in `src/components/Dialogs/CloseConfirmDialog.tsx:19`.
- `src/test/04c-file-save-close.test.tsx:46` covers dirty close prompts; `src/test/04c-file-save-close.test.tsx:123` covers Close All.

## Gaps / Mismatches
- Photoshop's Apply to All checkbox for multiple unsaved closes is not present.
- Close and Go to Bridge is excluded, but the absence may surprise users coming from this exact lesson.

## Scope Decision
Fix

## Recommended Follow-up
Add an Apply to All path for multi-document close prompts, or explicitly accept the simpler close-confirm flow in the file/close cluster notes.
