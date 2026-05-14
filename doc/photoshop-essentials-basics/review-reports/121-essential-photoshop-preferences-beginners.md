# 121 essential-photoshop-preferences-beginners
- Lesson path: `doc/photoshop-essentials-basics/essential-photoshop-preferences-beginners/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `02-preferences`

## Lesson Expectations
- Preferences sidebar categories include General, Interface, Tools, File Handling, Performance; General has Export Clipboard; Interface has Color Theme, Highlight Color, UI Font Size; Tools has Show Tool Tips and Use Shift Key for Tool Switch; File Handling includes Auto Save (`getting-started-preferences-photoshop-preferences-dialog-box-588b210e.png`, `getting-started-preferences-photoshop-export-clipboard-f86062ec.png`, `getting-started-preferences-photoshop-default-color-theme-swatch-aed22771.png`).

## Photoweb Coverage
- Preferences dialog has category sidebar and tested General/Interface/Tools/File Handling/Performance sections (`src/components/Dialogs/PreferencesDialog.tsx:20`, `src/test/02-preferences.test.tsx:19`).
- Interface color-theme thumbnails and Neutral Color Mode are implemented (`src/components/Dialogs/PreferencesDialog.tsx:162`, `src/test/02-preferences.test.tsx:29`).
- Use Shift Key for Tool Switch is implemented/tested (`src/components/Dialogs/PreferencesDialog.tsx:215`, `src/test/02-preferences.test.tsx:51`).

## Gaps / Mismatches
- Export Clipboard, Highlight Color, UI Font Size, Show Tool Tips, and richer File Handling/Auto Save controls were not confirmed in the inspected Preferences implementation.
- Some omissions are logged as deliberate preferences-scope reductions (`doc/photoshop-essentials-basics/divergence-log.md:155`).

## Scope Decision
Needs product decision: beginner preferences are partially in scope, but several options may be nonessential browser baggage.

## Recommended Follow-up
Decide whether to add Export Clipboard and UI Font Size; keep Show Tool Tips/Rich Tool Tips out unless broader help chrome is reintroduced.
