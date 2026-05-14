# 120 reset-photoshop-preferences
- Lesson path: `doc/photoshop-essentials-basics/reset-photoshop-preferences/lesson.md`
- Scope status: `out_of_scope: prefs_reset`
- Cluster coverage: `none`

## Lesson Expectations
- Hold Shift+Ctrl+Alt / Shift+Cmd+Option at launch to delete the Adobe Photoshop Settings file, or Preferences > General > Reset Preferences On Quit, confirm, quit, relaunch (`troubleshooting-reset-photoshop-preferences-delete-adobe-photoshop-preferences-file-5c8c9079.png`, `troubleshooting-reset-photoshop-preferences-reset-preferences-on-quit-379f2423.png`).

## Photoweb Coverage
- Preferences dialog exists and opens General by default (`src/components/Dialogs/PreferencesDialog.tsx:67`, `src/components/Dialogs/PreferencesDialog.tsx:76`).
- Chrome/panel settings persist in localStorage-backed slices (`src/store/viewSlice.ts:308`, `src/store/panelsSlice.ts:94`).

## Gaps / Mismatches
- Reset preferences on quit, launch modifier reset, and broad settings deletion are explicitly excluded.

## Scope Decision
Out of scope.

## Recommended Follow-up
No action.
