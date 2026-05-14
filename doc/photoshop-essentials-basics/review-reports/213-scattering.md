# 213 scattering
- Lesson path: `doc/photoshop-essentials-basics/scattering/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `21-brush-dynamics`

## Lesson Expectations
- Scattering spreads brush tips away from the stroke path; Both Axes scatters perpendicular and along the path.
- Count duplicates tips per stamp; Count Jitter randomizes duplicate count; Control can bind scatter to pen/fade.
- UI screenshots: `brush-dynamics-scattering-photoshop-scatter-options-f4d314c3.gif`, `brush-dynamics-scattering-both-axis-75d5614d.gif`, `brush-dynamics-scattering-count-jitter-671d98bc.gif`.

## Photoweb Coverage
- `Scattering` tab exposes Scatter, Both Axes, Count, Count Jitter, and Control (`src/components/Panels/BrushDynamicsControls.tsx:187-197`).
- Brush engine scatters stamp offsets and count per stamp (`src/utils/brushDynamics.ts:329-381`).
- Tests cover UI wiring and real-pixel scattering output (`src/test/21-brush-dynamics.test.tsx:78-95`, `src/test/21-brush-dynamics.test.tsx:187-205`).

## Gaps / Mismatches
- No preview stroke strip, so users adjust scatter without Photoshop’s immediate panel preview.
- Maximum count/scatter ranges may be intentionally smaller than Photoshop; this should be checked against desired performance limits.

## Scope Decision
Fix.

## Recommended Follow-up
Add preview stroke and note any deliberate range caps in the divergence log if performance-driven.
