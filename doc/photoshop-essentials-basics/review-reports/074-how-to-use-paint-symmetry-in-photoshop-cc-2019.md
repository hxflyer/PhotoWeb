# 074 how-to-use-paint-symmetry-in-photoshop-cc-2019
- Lesson path: `doc/photoshop-essentials-basics/how-to-use-paint-symmetry-in-photoshop-cc-2019/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 20c-paint-symmetry

## Lesson Expectations
- Add new layer, select Brush/Pencil/Eraser, click butterfly icon in Options Bar, choose symmetry type such as Vertical, Horizontal, Dual Axis, Radial, Mandala.
- Blue symmetry path appears and affects the whole canvas; resizing is generally unnecessary.
- Painting mirrors strokes through the active symmetry path; Show/Hide Symmetry controls visibility.
- Screenshots grounding UI: `2019-paint-symmetry-paint-symmetry-butterfly-icon-aea96f79.png`, `2019-paint-symmetry-paint-symmetry-options-12410472.png`, `2019-paint-symmetry-dual-axis-symmetry-path-d1541eab.png`, `2019-paint-symmetry-paint-with-symmetry-photoshop-c4818c44.jpg`.

## Photoweb Coverage
- Paint Symmetry cluster tests confirm Options Bar menu creates a pending path, Enter commits it, and Brush mirrors strokes in `src/test/20c-paint-symmetry.test.tsx:60`.
- Tests also cover Hide/Show Symmetry and Pencil Tool mirroring in `src/test/20c-paint-symmetry.test.tsx:87`.
- Brush/Pencil integration follows normal paint tool routing.

## Gaps / Mismatches
- Need inspect exact Options Bar icon/labels for the butterfly menu; tests confirm behavior, but visual parity was not reviewed line-by-line.
- Coverage may not include all Photoshop symmetry presets, especially Mandala/Radial variants.
- Eraser symmetry was not explicitly seen in tests.

## Scope Decision
Fix

## Recommended Follow-up
Add tests or report notes for Eraser symmetry and full preset list parity.

