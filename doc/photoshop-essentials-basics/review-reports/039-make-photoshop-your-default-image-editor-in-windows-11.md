# 039 make-photoshop-your-default-image-editor-in-windows-11
- Lesson path: `doc/photoshop-essentials-basics/make-photoshop-your-default-image-editor-in-windows-11/lesson.md`
- Scope status: `out_of_scope: os_integration` from lessons.json
- Cluster coverage: none

## Lesson Expectations
- Windows 11 file properties, "Open with" app chooser, set Photoshop as default viewer/editor for image extensions, then double-click files to open in Photoshop.
- Screenshots include `2021-default-image-editor-win11-open-view-menu-9beb0fe0.png`, `2021-default-image-editor-win11-properties-dialog-default-photos-app-6e48e3d4.png`, and `2021-default-image-editor-win11-set-photoshop-as-default-viewer-win11-b4f4efbd.png`.

## Photoweb Coverage
- OS default image-editor and file-type registration workflows are explicitly excluded (`CLAUDE.md:136`).
- Photoweb supports in-app File > Open and drag/drop instead (`src/components/layout/MenuBar.tsx:176`, `src/components/Canvas/Viewport.tsx:1511`).

## Gaps / Mismatches
- No Windows/macOS file association or shell integration.

## Scope Decision
out of scope

## Recommended Follow-up
No action.
