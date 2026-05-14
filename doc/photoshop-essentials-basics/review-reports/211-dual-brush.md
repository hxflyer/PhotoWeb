# 211 dual-brush
- Lesson path: `doc/photoshop-essentials-basics/dual-brush/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `21-brush-dynamics`

## Lesson Expectations
- Dual Brush combines a primary brush tip with a second brush tip to mask/texture the stroke.
- User chooses a second brush, then adjusts Diameter, Spacing, Scatter, Count, Blend Mode, and Flip.
- UI screenshots: `brush-dynamics-dual-brush-photoshop-dual-brush-3a92b64e.gif`, `brush-dynamics-dual-brush-selecting-second-brush-f4c9b8f4.gif`, `brush-dynamics-dual-brush-blend-mode-9556fff3.gif`.

## Photoweb Coverage
- `Dual Brush` tab exposes Diameter, Spacing, Scatter, Count, Mode, and Flip (`src/components/Panels/BrushDynamicsControls.tsx:219-228`).
- Brush dynamics engine multiplies in dual-brush pattern values per stamp (`src/utils/brushDynamics.ts:406-435`).
- Tests assert texture and dual brush modulation changes stamped alpha (`src/test/21-brush-dynamics.test.tsx:134-185`).

## Gaps / Mismatches
- Photoweb does not expose a second-brush preset picker comparable to Photoshop’s brush-tip grid in the lesson; it uses parameterized procedural dual brush controls.
- Blend modes are a small subset and do not match the full Photoshop Dual Brush mode list.
- No live preview strip.

## Scope Decision
Fix.

## Recommended Follow-up
Add a second-tip picker fed by saved brush presets or built-in tips, and treat missing Dual Brush blend modes as a product-priority decision.
