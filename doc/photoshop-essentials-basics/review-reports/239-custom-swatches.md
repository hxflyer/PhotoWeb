# 239 custom-swatches
- Lesson path: `doc/photoshop-essentials-basics/custom-swatches/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `23-color-swatches`

## Lesson Expectations
- Swatches panel supports deleting existing swatches, sampling colors with Eyedropper, adding foreground color as a named swatch, saving swatch sets, resetting defaults, loading custom sets, and clicking swatches to set foreground.
- UI screenshots: `custom-swatches-photoshop-swatches-palette-dbc6ffa2.gif`, `custom-swatches-new-swatch-dialog-box-7e1802a0.gif`, `custom-swatches-save-swatches-4a0060e5.gif`.

## Photoweb Coverage
- Color slice stores swatches and swatch groups with persistence, add/remove/rename/collapse (`src/store/colorSlice.ts:11-218`).
- Eyedropper tool samples active/current or all layers and updates color (`src/tools/eyedropper.ts:5-83`).
- Swatches panel is exposed in Window menu (`src/components/layout/MenuBar.tsx:690`) and panel visibility (`src/store/panelsSlice.ts:67`).
- Tests cover color swatches and eyedropper wiring (`src/test/23-color-swatches.test.tsx`, `src/test/colorPickerWiringBatchC.test.tsx`).

## Gaps / Mismatches
- Need to confirm explicit Save Swatches/Load Swatches set commands exist; storage is local persistent groups, not Photoshop `.aco`/`.ase`.
- New Swatch naming dialog behavior may be simplified compared with Photoshop.

## Scope Decision
Fix.

## Recommended Follow-up
Add swatch set import/export or record local JSON persistence as accepted divergence; verify New Swatch naming and default reset.
