# 171 interface-cs6
- Lesson path: `doc/photoshop-essentials-basics/interface-cs6/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `01a-interface-shell`

## Lesson Expectations
- Four gray interface color themes are set in Preferences > Interface or cycled with Shift+F1/F2; screenshots include `new-features-interface-color-theme-thumbnails-3c34397a.gif`.
- Pasteboard color changes via right-click/Control-click menu with neutral gray presets or custom Color Picker (`new-features-interface-new-pasteboard-color-c09b498b.gif`, `new-features-interface-select-custom-color-73ca5c3d.gif`).

## Photoweb Coverage
- Color theme and pasteboard color are persisted in `src/store/viewSlice.ts:301` and applied by `src/App.tsx:173`.
- Shift+F1/F2 theme cycling is implemented in `src/App.tsx:218`.
- Preferences > Interface shows color-theme thumbnails and Neutral Color Mode in `src/components/Dialogs/PreferencesDialog.tsx:162`.
- Pasteboard context menu is rendered from `src/components/layout/PasteboardContextMenu.tsx`.

## Gaps / Mismatches
- No major mismatch found for the in-scope theme/pasteboard subset.
- Photoshop's broader CS6 interface history is intentionally not a parity target.

## Scope Decision
divergence already accepted.

## Recommended Follow-up
No action.
