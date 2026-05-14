# 030 photoshop-selection-basics-the-rectangular-and-elliptical-marquee-tools
- Lesson path: `doc/photoshop-essentials-basics/photoshop-selection-basics-the-rectangular-and-elliptical-marquee-tools/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 12-marquee

## Lesson Expectations
- Rectangular/Elliptical Marquee in toolbar flyout, shortcut M/Shift+M, draw from corner, Alt from center, Shift square/circle, Space reposition mid-drag, Fixed Ratio/Fixed Size, add/subtract/intersect.
- Screenshots include `2022-rectangular-elliptical-marquee-tool-photoshop-marquee-selection-tools-12f3d2c9.png`, `2022-rectangular-elliptical-marquee-tool-draw-square-selection-outline-photoshop-c8a3f546.png`, and `2022-rectangular-elliptical-marquee-tool-selection-tool-style-80607183.png`.

## Photoweb Coverage
- Toolbar flyout and shortcut expose marquee tools (`src/components/Panels/Toolbar.tsx:35`, `src/components/Panels/Toolbar.tsx:37`, `src/core/shortcuts.ts:92`).
- Options Bar exposes operation buttons, feather/anti-alias, Normal/Fixed Ratio/Fixed Size, W/H, and swap (`src/components/Panels/OptionsBar.tsx:333`, `src/components/Panels/OptionsBar.tsx:384`, `src/test/12-marquee.test.tsx:66`).
- Tests cover fixed size, fixed ratio, ellipse/circle, Space reposition, and app Space shortcut not stealing the gesture (`src/test/12-marquee.test.tsx:88`, `src/test/12-marquee.test.tsx:99`, `src/test/12-marquee.test.tsx:110`, `src/test/12-marquee.test.tsx:122`).
- Shift/Alt/intersect selection operations are covered (`src/test/selection.test.ts:118`, `src/test/selectionIntersect.test.ts:60`).

## Gaps / Mismatches
- None found after checking lesson, scope, code, and tests.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
