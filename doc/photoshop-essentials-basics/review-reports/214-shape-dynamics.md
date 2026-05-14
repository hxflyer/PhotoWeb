# 214 shape-dynamics
- Lesson path: `doc/photoshop-essentials-basics/shape-dynamics/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `21-brush-dynamics`

## Lesson Expectations
- Shape Dynamics controls Size Jitter, Minimum Diameter, Control/Fade, Angle Jitter, Roundness Jitter, Minimum Roundness, and pen tilt/pressure style controls.
- Brush Tip Shape spacing and the preview strip show the effect of jitter over a stroke.
- UI screenshots: `photoshop-brushes-brush-dynamics-shape-dynamics-options-d1ce4df6.gif`, `photoshop-brushes-brush-dynamics-brush-size-control-options-8c783721.gif`, `photoshop-brushes-brush-dynamics-angle-jitter-4fbdf4b3.gif`.

## Photoweb Coverage
- Brush dynamics model includes shape dynamics and cloning/defaults (`src/utils/brushDynamics.ts:80-92`, `src/utils/brushDynamics.ts:136-195`).
- Brush engine resolves stamp size, angle, roundness, and pressure/fade inputs (`src/utils/brushDynamics.ts:309-378`).
- Brush dynamics tests exercise size variation with scattering/color/opacity (`src/test/21-brush-dynamics.test.tsx:97-132`).

## Gaps / Mismatches
- The UI evidence from `rg` shows tabs for Scattering/Texture/Dual/Color/Other, but not a visible `Shape Dynamics` tab label in `BrushDynamicsControls.tsx`; shape controls may be hidden or underexposed.
- No live preview strip.
- Pen tilt/roundness-specific behavior appears weaker than the Photoshop lesson’s stylus-heavy controls.

## Scope Decision
Fix.

## Recommended Follow-up
Expose/audit a full Shape Dynamics tab with Size, Angle, Roundness, minimums, control dropdowns, and preview tests.
