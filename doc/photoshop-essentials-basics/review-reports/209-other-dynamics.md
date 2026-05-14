# 209 other-dynamics
- Lesson path: `doc/photoshop-essentials-basics/other-dynamics/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `21-brush-dynamics`

## Lesson Expectations
- Brush opacity and flow can be set from the Options Bar and varied in Brushes/Brush Settings > Other Dynamics.
- Opacity controls the maximum translucency of a whole stroke; Flow controls per-tip paint buildup, so overlapping tips within one stroke accumulate.
- Other Dynamics supports opacity/flow jitter and Control dropdowns such as Fade, Pen Pressure, Pen Tilt, and Stylus Wheel.
- UI screenshots: `brush-dynamics-other-dynamics-photoshop-brush-opacity-flow-3d7769fc.gif`, `brush-dynamics-other-dynamics-brush-stroke-flow-25-46471d16.gif`, `brush-dynamics-other-dynamics-opacity-control-pen-pressure-7eac69e5.gif`.

## Photoweb Coverage
- Brush dynamics UI has an `Other Dynamics` tab with Opacity Jitter, Opacity Ctrl, Opacity Fade, Flow Jitter, Flow Ctrl, and Flow Fade (`src/components/Panels/BrushDynamicsControls.tsx:245-252`).
- Per-stamp dynamics applies opacity and flow jitter/control in the brush engine (`src/utils/brushDynamics.ts:329-347`).
- Tests assert opacity/flow dynamics and stamped output (`src/test/21-brush-dynamics.test.tsx:97-132`).

## Gaps / Mismatches
- Stylus-specific controls are UI options, but browser/device pressure support is limited; no evidence of real stylus wheel/tilt integration beyond available pointer pressure.
- The lesson’s distinction between stroke opacity and flow buildup is partly engine-backed, but there is no dedicated visual preview in the Brushes panel like Photoshop’s bottom stroke preview.

## Scope Decision
Fix.

## Recommended Follow-up
Add a compact brush-stroke preview for dynamics tabs and document/control-test which controls are effective with mouse vs PointerEvent pen pressure.
