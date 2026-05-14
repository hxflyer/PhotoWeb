# 042 how-to-make-photoshop-your-default-image-editor
- Lesson path: `doc/photoshop-essentials-basics/how-to-make-photoshop-your-default-image-editor/lesson.md`
- Scope status: `out_of_scope: os_integration`
- Cluster coverage: none

## Lesson Expectations
- Windows: File Explorer file extensions, image Properties, `Opens with` Change button, More apps, and per-extension default app assignment.
- macOS: Finder Get Info, `Open with` dropdown, `Change All`, confirmation prompt.
- Screenshots grounding UI: `2021-default-image-editor-open-image-properties-e140e588.png`, `2021-default-image-editor-choose-photoshop-app-windows-03dd2a15.png`, `2021-default-image-editor-mac-get-info-open-with-photoshop-0525cf3c.jpg`.

## Photoweb Coverage
- None expected. The app opens files through browser file inputs and drag/drop, not OS file associations.
- Relevant in-scope open paths exist under `File > Open…` / `Place Embedded…` in `src/components/layout/MenuBar.tsx:175` and `src/components/layout/MenuBar.tsx:177`.
- Browser ingest code handles selected/dropped files in `src/utils/fileIngest.ts:59`.

## Gaps / Mismatches
- No OS-level default editor registration, per-extension association, Finder integration, or Windows Properties workflow.
- This is an intentional scope exclusion, not a product gap.

## Scope Decision
out of scope

## Recommended Follow-up
No action.

