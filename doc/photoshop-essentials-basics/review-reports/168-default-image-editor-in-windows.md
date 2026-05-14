# 168 default-image-editor-in-windows
- Lesson path: `doc/photoshop-essentials-basics/default-image-editor-in-windows/lesson.md`
- Scope status: `out_of_scope: os_integration`
- Cluster coverage: `none`

## Lesson Expectations
- Windows File Explorer and macOS Finder set Photoshop as the OS default app for image file types; screenshots include `2021-default-image-editor-open-image-properties-e140e588.png` and `2021-default-image-editor-get-info-mac-...` equivalents.
- Uses OS Properties/Get Info dialogs, file associations, and "Change All".

## Photoweb Coverage
- Photoweb supports browser File > Open, drag/drop, and hidden file inputs in `src/App.tsx:914` and `src/components/layout/MenuBar.tsx`.
- No OS-level registration surface exists, consistent with browser deployment and the `os_integration` exclusion.

## Gaps / Mismatches
- None found for in-scope Photoweb behavior; the lesson is about operating-system file association.

## Scope Decision
out of scope.

## Recommended Follow-up
No action.
