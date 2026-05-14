# 210 color-dynamics
- Lesson path: `doc/photoshop-essentials-basics/color-dynamics/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `21-brush-dynamics`

## Lesson Expectations
- Color Dynamics varies Foreground/Background mix, Hue Jitter, Saturation Jitter, Brightness Jitter, and Purity.
- Foreground/background jitter depends on current toolbar swatches; control dropdowns can bind variation to pen input/fade.
- Color Picker and toolbar foreground/background swatches ground the workflow.
- UI screenshots: `brush-dynamics-color-dynamics-color-dynamics-options-df39c877.gif`, `brush-dynamics-color-dynamics-foreground-background-control-a7f51f9b.gif`, `brush-dynamics-color-dynamics-photoshop-color-picker-cbc95bf6.jpg`.

## Photoweb Coverage
- `Color Dynamics` tab exposes Fg/Bg Jitter, Control, Fade, Hue Jitter, Sat Jitter, Bright Jitter, and Purity (`src/components/Panels/BrushDynamicsControls.tsx:233-241`).
- Brush engine resolves color dynamics against primary/secondary colors (`src/utils/brushDynamics.ts:309-328`).
- Tests cover color variation with scattering and opacity/flow (`src/test/21-brush-dynamics.test.tsx:97-132`).

## Gaps / Mismatches
- Label shortening (`Fg/Bg`, `Sat`, `Bright`) is less Photoshop-literal than the lesson’s full labels.
- No Photoshop-style live stroke preview strip in the Brush Settings/Brushes panel.
- Pen-pressure/fade behavior appears tested generally, but not each color-control combination.

## Scope Decision
Fix.

## Recommended Follow-up
Use full Photoshop labels where space allows, add a preview stroke, and add focused tests for foreground/background fade and pen-pressure fallback behavior.
