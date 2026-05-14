# 173 warp-text
- Lesson path: `doc/photoshop-essentials-basics/warp-text/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `25a-type-on-path-warp`

## Lesson Expectations
- With Type Tool and a Type layer active, Options Bar Warp Text icon opens a dialog (`type-warp-text-warp-text-option-3baad5cb.gif`, `type-warp-text-warp-text-dialog-box-9f730909.gif`).
- Dialog has Style presets, Horizontal/Vertical radio controls, Bend, Horizontal Distortion, and Vertical Distortion; effect remains editable and can be changed or disabled.

## Photoweb Coverage
- Type layer data stores warp settings in `src/tools/type.ts:86`.
- Committed type rasterization applies the warp transform in `src/tools/type.ts:708`.
- App has a Warp overlay for image transforms in `src/App.tsx:1378`, and type warp tests exist in `src/test/25a-type-on-path-warp.test.tsx`.

## Gaps / Mismatches
- Code evidence shows warp data/application, but this pass did not find a Photoshop-style Warp Text dialog component name; if the UI is embedded in Options Bar/Properties instead, it may miss the exact dialog habit from the lesson.
- Need to confirm all 15 Photoshop warp styles and Horizontal/Vertical controls are exposed.

## Scope Decision
needs product decision.

## Recommended Follow-up
Audit the type warp UI path visually and either add a Warp Text dialog/Options Bar icon or record the current UI as an accepted divergence.
