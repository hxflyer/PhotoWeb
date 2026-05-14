# 123 color-settings
- Lesson path: `doc/photoshop-essentials-basics/color-settings/lesson.md`
- Scope status: `out_of_scope: color_management`
- Cluster coverage: `none`

## Lesson Expectations
- Edit > Color Settings opens a dialog for presets, Working Spaces, RGB sRGB vs Adobe RGB (1998), color-management policies, save preset/comment (`interface-color-settings-photoshop-colorsettings-dialog-bb582fb0.png`, `interface-color-settings-choose-adobe-rgb-1998-21c139fc.png`).

## Photoweb Coverage
- Document tab/status surfaces use RGB/8-style vocabulary, but the app contract assumes sRGB end-to-end (`src/components/layout/DocumentTab.tsx:113`, `doc/photoshop-essentials-basics/divergence-log.md:28`).
- No Color Settings dialog or working-space conversion was found.

## Gaps / Mismatches
- Color management, working spaces, CMYK/Gray/Spot policies, and Adobe RGB switching are explicitly excluded.

## Scope Decision
Out of scope.

## Recommended Follow-up
No action.
