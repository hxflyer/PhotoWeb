# 170 background-auto-save-cs6
- Lesson path: `doc/photoshop-essentials-basics/background-auto-save-cs6/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `02-preferences`

## Lesson Expectations
- Background Save lets editing continue while large files save, with progress percentage/bar in tab/status area (`new-features-background-auto-save-save-percentage-a6b962e2.jpg`, `new-features-background-auto-save-save-progress-bar-326d07dc.jpg`).
- Auto Save lives in Preferences > File Handling with intervals and crash recovery prompt on next launch.

## Photoweb Coverage
- Auto-save writes to an autosave slot every interval in `src/core/autoSave.ts:2` and persistence handles autosave storage in `src/core/persistence.ts:394`.
- Preferences exposes autosave interval under File Handling in `src/components/Dialogs/PreferencesDialog.tsx:224`.
- App shows an autosave recovery banner with Recover/Discard in `src/App.tsx:1081`.

## Gaps / Mismatches
- No Background Save progress indicator in document tab or status bar while manual save is running.
- Preferences interval is seconds-based and browser-specific rather than Photoshop's 5/10/15/30 minute choices.

## Scope Decision
Fix.

## Recommended Follow-up
Add save-progress/status feedback for long saves, or record a browser-storage divergence if precise Photoshop background-save progress is not feasible.
