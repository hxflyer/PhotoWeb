# 183 photoshop-shape-essentials
- Lesson path: `doc/photoshop-essentials-basics/photoshop-shape-essentials/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `26a-shape-concepts`

## Lesson Expectations
- Shape tools include Rectangle, Rounded Rectangle, Ellipse, Polygon, and Line; Options Bar chooses Shape mode and color (`shapes-shape-tools-options-bar-dc9682ad.gif`).
- Drag draws shapes; Alt/Option draws from center, Shift constrains square/circle; shape layer appears in Layers panel.
- Shape color can be changed later without quality loss.

## Photoweb Coverage
- Shape tool group is registered under `u` in `src/App.tsx:724`.
- Options Bar includes fill/stroke swatches and shape-specific controls in `src/components/Panels/OptionsBar.tsx:2147`.
- Tests cover shape modes and geometric shape creation in `src/test/26a-shape-concepts.test.tsx:64` and `src/test/26b-geometric-shapes.test.tsx:78`.

## Gaps / Mismatches
- Exact Photoshop modifiers for drawing from center/constraining all shape tools need targeted test confirmation.
- Older Photoshop color-only Shape Layer behavior differs from current Fill/Stroke UI; likely acceptable for a modern browser editor but should stay Photoshop-vocabulary aligned.

## Scope Decision
Fix.

## Recommended Follow-up
Add simulator tests for Shift and Alt/Option shape-drawing modifiers across Rectangle/Ellipse/Polygon.
