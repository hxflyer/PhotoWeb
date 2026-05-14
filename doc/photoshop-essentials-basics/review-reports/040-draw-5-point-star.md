# 040 draw-5-point-star
- Lesson path: `doc/photoshop-essentials-basics/draw-5-point-star/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 26b-geometric-shapes

## Lesson Expectations
- New document, Polygon Tool, reset tool options, fill color, stroke off, draw polygon, set Star Ratio to create a 5-point star, save it as a custom shape, and reuse via Custom Shape Tool.
- Key UI surfaces: Polygon Tool options, Star checkbox/ratio, Edit > Define Custom Shape, custom shape group/picker.

## Photoweb Coverage
- Polygon shape options include sides, Star, Star Ratio, Smooth Corners, and Smooth Indents (`src/tools/shapes.ts:40`, `src/components/Panels/OptionsBar.tsx:2253`, `src/components/Panels/OptionsBar.tsx:2272`, `src/components/Panels/OptionsBar.tsx:2283`).
- Built-in custom shape library includes `5-Point Star` (`src/tools/customShapes.ts:106`).
- Edit > Define Custom Shape and save/load custom shape sets are implemented/tested (`src/components/layout/MenuBar.tsx:267`, `src/components/layout/MenuBar.tsx:276`, `src/test/27b-custom-shape-presets.test.tsx:108`).
- Custom Shape Tool is in the U shape group (`src/components/Panels/Toolbar.tsx:130`).

## Gaps / Mismatches
- None found for the lesson's star creation and save-as-custom-shape workflow.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
