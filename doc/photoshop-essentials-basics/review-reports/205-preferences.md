# 205 preferences
- Lesson path: `doc/photoshop-essentials-basics/preferences/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `02-preferences`

## Lesson Expectations
- Ctrl/Cmd+K opens Preferences; General has Image Interpolation, Export Clipboard, and Use Shift Key For Tool Switch (`cs5-preferences-image-interpolation-33abe20b.gif`, `cs5-preferences-use-shift-key-316ee989.gif`).
- Zoom preferences, Interface preferences, Image Border, Tool Tips, Tabbed Documents, UI Font Size, and File Handling settings are shown in category panes.

## Photoweb Coverage
- Preferences dialog has categories for General, Interface, Tools, File Handling, and Performance in `src/components/Dialogs/PreferencesDialog.tsx:115`.
- Interface includes color themes, Neutral Color Mode, and UI Font Size in `src/components/Dialogs/PreferencesDialog.tsx:162`.
- Tools includes Use Shift Key for Tool Switch in `src/components/Dialogs/PreferencesDialog.tsx:215`; shortcut cycling honors it in `src/App.tsx:736`.
- Tests cover categories and the tool-switch preference in `src/test/02-preferences.test.tsx:19`.

## Gaps / Mismatches
- General pane explicitly says Image Interpolation is not implemented yet (`src/components/Dialogs/PreferencesDialog.tsx:154`), despite this lesson expecting it.
- Export Clipboard, Zoom preferences, Image Border, Tool Tips, Tabbed Documents/Open Documents As Tabs are missing or intentionally excluded; tabbed documents are `multi_doc_ui`.

## Scope Decision
Fix.

## Recommended Follow-up
Add in-scope preferences for default Image Interpolation and Export Clipboard; leave tabbed-documents preferences out of scope and record that divergence if needed.
