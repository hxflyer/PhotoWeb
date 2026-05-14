# 034 photoshop-birds-eye-view-tutorial
- Lesson path: `doc/photoshop-essentials-basics/photoshop-birds-eye-view-tutorial/lesson.md`
- Scope status: `out_of_scope: nav_extras` from lessons.json
- Cluster coverage: none

## Lesson Expectations
- Hold H, click-and-hold to temporarily zoom out into Birds Eye View, drag the rectangle to a new area, release to zoom back in there.
- Screenshots include `2022-birds-eye-view-hand-tool-keyboard-shortcut-7f8896e5.png`, `2022-birds-eye-view-photoshop-birds-eye-view-107cc1b8.jpg`, and `2022-birds-eye-view-move-birds-eye-view-rectangle-0401bac0.jpg`.

## Photoweb Coverage
- Birds Eye View is explicitly excluded as a navigation extra (`CLAUDE.md:141`, `doc/photoshop-essentials-basics/divergence-log.md:165`).
- Hand/Zoom basics are covered separately (`src/tools/handZoom.ts`, `src/test/03-navigation.test.tsx:64`).

## Gaps / Mismatches
- No hold-H Birds Eye View overlay or draggable viewport rectangle, by scope decision.
- Existing Navigator panel overlaps the broader excluded navigation-extra category (`src/components/Panels/NavigatorPanel.tsx:7`).

## Scope Decision
out of scope

## Recommended Follow-up
No action for Birds Eye View; see lesson 004/035 product decision about Navigator and multi-document-ish UI.
