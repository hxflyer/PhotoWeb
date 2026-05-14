# 109 photoshop-image-navigation-tips-tricks-and-shortcuts
- Lesson path: `doc/photoshop-essentials-basics/photoshop-image-navigation-tips-tricks-and-shortcuts/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `03-navigation`

## Lesson Expectations
- Cmd/Ctrl+0 Fit on Screen, Cmd/Ctrl+1 100%, Cmd/Ctrl+Space temporary Zoom In, Alt/Option+Space zoom out, Space temporary Hand, double-click Hand for Fit, double-click Zoom for 100%, Scrubby Zoom, Navigator panel, Rotate View, Birds Eye View (`navigation-tips-tricks-shortcuts-photoshop-navigation-fit-on-screen-dfe85117.jpg`, `navigation-tips-tricks-shortcuts-photoshop-navigator-panel-0121edc9.jpg`).

## Photoweb Coverage
- View menu exposes Zoom In/Out, Fit on Screen, and 100% (`src/components/layout/MenuBar.tsx:630`).
- Zoom Tool click, Alt-click, scrubby zoom, editable status-bar zoom, and anchored wheel zoom are tested (`src/test/03-navigation.test.tsx:40`, `src/test/03-navigation.test.tsx:64`, `src/test/03-navigation.test.tsx:102`).
- Hand and Zoom tools are registered in shortcut docs (`src/core/shortcuts.ts:107`).
- Navigator panel exists, though navigation extras are excluded globally (`src/components/Panels/NavigatorPanel.tsx:7`).

## Gaps / Mismatches
- Rotate View, Birds Eye View, Zoom All Windows, and Scroll All Windows are scope-excluded.
- Need explicit evidence for Space/Cmd+Space spring-loaded temporary tools and double-click toolbar icon behavior beyond tests' comments.

## Scope Decision
Fix for temporary-tool/double-click verification; out of scope for nav extras.

## Recommended Follow-up
Add or confirm tests for Space temporary Hand, Cmd/Ctrl+Space temporary Zoom, and double-click Hand/Zoom toolbar icons.
