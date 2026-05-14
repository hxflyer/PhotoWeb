# 111 photoshop-cc-overscroll
- Lesson path: `doc/photoshop-essentials-basics/photoshop-cc-overscroll/lesson.md`
- Scope status: `out_of_scope: nav_extras`
- Cluster coverage: `none`

## Lesson Expectations
- Preferences > Tools > Overscroll allows panning even when the image fits on screen; with Overscroll off, Hand cannot pan a fully visible image (`2022-overscroll-turn-overscroll-off-photoshop-022338d2.png`, `2022-overscroll-scroll-image-with-overscroll-in-photoshop-51efa189.jpg`).

## Photoweb Coverage
- Viewport supports pan and anchored zoom (`src/components/Canvas/Viewport.tsx:809`).
- Preferences > Tools exists but only surfaced tool-switch settings in this pass (`src/components/Dialogs/PreferencesDialog.tsx:215`).

## Gaps / Mismatches
- Overscroll preference and Photoshop's bounded/unbounded pan distinction are excluded as navigation extras.

## Scope Decision
Out of scope.

## Recommended Follow-up
No action.
