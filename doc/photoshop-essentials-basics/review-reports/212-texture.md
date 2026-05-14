# 212 texture
- Lesson path: `doc/photoshop-essentials-basics/texture/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `21-brush-dynamics`

## Lesson Expectations
- Texture options choose a pattern, mode, depth, texture-each-tip, control, minimum depth, jitter, invert, and scale.
- Photoshop pattern picker menu can load/replace/append pattern sets.
- UI screenshots: `brush-dynamics-texture-pattern-picker-c52ad700.gif`, `brush-dynamics-texture-replace-append-0621ad80.gif`, `brush-dynamics-texture-texture-each-tip-c3a7ce49.gif`.

## Photoweb Coverage
- `Texture` tab exposes Pattern, Mode, Scale, Depth, Min Depth, Depth Jitter, Texture Each Tip, and Invert (`src/components/Panels/BrushDynamicsControls.tsx:200-214`).
- Engine computes procedural texture values and applies min depth/jitter/invert/each-tip behavior (`src/utils/brushDynamics.ts:391-434`).
- Tests cover texture and dual-brush alpha modulation (`src/test/21-brush-dynamics.test.tsx:134-185`).

## Gaps / Mismatches
- Texture pattern choices are limited procedural entries (`Checker`, `Dots`, `Paper`), not the app’s pattern preset library or Photoshop-style pattern sets.
- No Replace/Append pattern-set flow from this panel; pattern-set management lives elsewhere and is not tied into brush texture.
- No live preview strip.

## Scope Decision
Fix.

## Recommended Follow-up
Wire Texture pattern selection to `patternPresets` and make imported/saved patterns available to brush texture dynamics.
