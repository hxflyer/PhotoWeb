# 068 how-to-avoid-losing-your-original-images-in-photoshop
- Lesson path: `doc/photoshop-essentials-basics/how-to-avoid-losing-your-original-images-in-photoshop/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 04c-file-save-close

## Lesson Expectations
- Immediately File > Save As, rename with `_copy`, choose format, and use JPEG Options (quality, baseline/progressive) to protect the original.
- Work non-destructively with layers/adjustment layers/Smart Objects where possible; File > Close prompts to save changes.
- Screenshots grounding UI: `cc-avoid-losing-originals-photoshop-save-as-command-387357a9.png`, `cc-avoid-losing-originals-save-as-copy-8fd6cb4d.png`, `cc-avoid-losing-originals-jpeg-options-photoshop-cf6742de.png`, `cc-avoid-losing-originals-document-tab-new-file-a50bc5ba.png`.

## Photoweb Coverage
- File menu exposes Save, Save As, Export As, Quick Export PNG, Close/Close All in `src/components/layout/MenuBar.tsx:185`.
- Save As format selector and JPEG Options are tested in `src/test/04c-file-save-close.test.tsx:138`.
- Close dirty-document prompt behavior is tested in `src/test/04c-file-save-close.test.tsx:46`.
- Photoweb layer/adjustment model supports non-destructive layer workflows; Smart Objects are excluded.

## Gaps / Mismatches
- Native Photoshop PSD/TIFF format parity is not in scope; Photoweb uses `.pwbdoc`, JPEG, and PNG-style flows.
- Browser save/download UX cannot exactly match OS Save As dialogs.
- Smart Object recommendation from lesson is out of scope.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.

