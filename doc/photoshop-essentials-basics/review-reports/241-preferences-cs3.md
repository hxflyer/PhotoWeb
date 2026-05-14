# 241 preferences-cs3
- Lesson path: `doc/photoshop-essentials-basics/preferences-cs3/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `02-preferences`

## Lesson Expectations
- Preferences dialog opens from Edit/Photoshop menu and includes General, Interface, File Handling, Performance, Cursors, Transparency & Gamut, Units & Rulers, Guides/Grid/Slices, Plug-Ins, Type.
- Settings include Image Interpolation, Automatically Launch Bridge, Export Clipboard, Use Shift Key For Tool Switch, UI colors/borders, file compatibility, memory/history/cache.
- UI screenshots: `preferences-cs3-general-preferences-0d457ed7.gif`, `preferences-cs3-use-shift-key-97194895.gif`, `preferences-cs3-interface-e9c1dd6a.gif`.

## Photoweb Coverage
- Preferences dialog uses Photoshop-like category sidebar with General, Interface, Tools, File Handling, and Performance (`src/components/Dialogs/PreferencesDialog.tsx:14-23`, `src/components/Dialogs/PreferencesDialog.tsx:159-175`).
- Interface color theme thumbnails exist (`src/components/Dialogs/PreferencesDialog.tsx:6-11`, `src/components/Dialogs/PreferencesDialog.tsx:162-175`).
- Tests assert categories and Interface category behavior (`src/test/02-preferences.test.tsx:22-31`).

## Gaps / Mismatches
- Many CS3 preferences are deliberately irrelevant or excluded: Bridge auto-launch, legacy file compatibility, plug-ins, color management, and advanced performance/cache tuning.
- `Use Shift Key For Tool Switch` is relevant to Photoshop muscle memory; need to confirm whether it is configurable or fixed.
- Image Interpolation is likely handled in Image Size, not as a global preference.

## Scope Decision
needs product decision.

## Recommended Follow-up
Decide which preferences should be real app settings versus read-only/excluded; specifically audit `Use Shift Key For Tool Switch` and global interpolation defaults.
