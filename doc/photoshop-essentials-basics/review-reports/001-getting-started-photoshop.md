# 001 getting-started-photoshop
- Lesson path: `doc/photoshop-essentials-basics/getting-started-photoshop/lesson.md`
- Scope status: `out_of_scope: adobe_bridge` from lessons.json
- Cluster coverage: none

## Lesson Expectations
- Get Photoshop installed/updated through Creative Cloud, install Adobe Bridge, import/browse photos, and hand off images to Photoshop.
- Set color settings/working spaces and sync them across Adobe apps.
- Adjust preferences such as interface, performance, auto-save, and reset preferences for troubleshooting.

## Photoweb Coverage
- The app contract explicitly excludes Adobe Bridge, Camera Raw, Creative Cloud sync, color management, install/update, and preferences reset workflows (`CLAUDE.md:135`, `CLAUDE.md:136`, `CLAUDE.md:141`).
- Photoweb does include scoped browser preferences such as interface theme, neutral mode, and auto-save categories (`src/components/Dialogs/PreferencesDialog.tsx:17`, `src/test/02-preferences.test.tsx:19`).

## Gaps / Mismatches
- No Adobe Bridge/import-from-camera workflow; this is intentionally outside the browser-editor target.
- No color settings / working color spaces; photoweb assumes sRGB end to end.
- No reset-preferences troubleshooting flow.

## Scope Decision
out of scope

## Recommended Follow-up
No action.
