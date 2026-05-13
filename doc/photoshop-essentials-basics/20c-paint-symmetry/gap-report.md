# 20c Paint Symmetry Gap Report

Cluster: `20c-paint-symmetry`

## Lessons Reviewed

- `how-to-use-paint-symmetry-in-photoshop-cc-2019` — Paint Symmetry appears from the Brush/Pencil/Eraser Options Bar butterfly menu, creates a blue symmetry path, is accepted with Enter/checkmark, mirrors paint strokes, supports hide/show/off, and includes Radial/Mandala segment counts.

## Current Photoweb Coverage

- Brush and Eraser share the active Viewport paint path in [Viewport.tsx](../../../src/components/Canvas/Viewport.tsx).
- Pencil uses a registered tool implementation in [pencil.ts](../../../src/tools/pencil.ts).
- Brush, Pencil, and Eraser Options Bar controls live in [OptionsBar.tsx](../../../src/components/Panels/OptionsBar.tsx).
- No existing Paint Symmetry state, Options Bar menu, canvas path overlay, or mirrored painting behavior existed before this tick.

## Gaps

- No Paint Symmetry menu for Brush, Pencil, or Eraser.
- No symmetry path visual overlay or Enter/checkmark commit state.
- Brush/Eraser/Pencil strokes did not mirror across symmetry modes.
- No Hide Symmetry / Show Symmetry / Symmetry Off behavior.
- No Radial or Mandala segment count surface.

## Photoshop-Habit Mismatches

- The butterfly Options Bar icon and menu are grounded by `2019-paint-symmetry-paint-symmetry-butterfly-icon-aea96f79.png` and `2019-paint-symmetry-paint-symmetry-options-12410472.png`; photoweb had no corresponding control.
- The blue symmetry path and Enter/checkmark commit are grounded by `2019-paint-symmetry-dual-axis-symmetry-path-d1541eab.png` and `2019-paint-symmetry-checkmark-51a19efe.png`; photoweb had no pending path state.
- Hide/show/off commands are grounded by `2019-paint-symmetry-hide-symmetry-b57d5f28.png`, `2019-paint-symmetry-show-symmetry-e1c6b580.png`, and `2019-paint-symmetry-turn-paint-symmetry-off-b85d682b.png`.
- Radial/Mandala segment prompts are grounded by `2019-paint-symmetry-radial-symmetry-segment-count-e73582bc.png` and `2019-paint-symmetry-mandala-symmetry-segment-count-d9903cff.png`.

## Implemented Work

- Added Paint Symmetry state for mode, last mode, path visibility, pending commit, and segment count.
- Added Brush/Pencil/Eraser Options Bar symmetry controls with Photoshop's mode names.
- Added pending path overlay inside the document, including line/circle/radial previews and Enter / Options Bar `OK` commit.
- Added Hide Symmetry / Show Symmetry and Symmetry Off.
- Mirrored Brush/Eraser dabs through the active symmetry path.
- Mirrored Pencil stamps through the active symmetry path.
- Added Radial/Mandala segment controls.

## Verification

- `npx tsc -b`
- `npm run lint` — 16 existing warnings, 0 errors.
- Focused tests:
  - `src/test/20c-paint-symmetry.test.tsx`
  - `src/test/20a-brush-tool.test.tsx`
  - `src/test/20b-brush-presets.test.tsx`
  - `src/test/pencilSpacing.test.ts`
- Full suite: `npm test` — 165 files / 1237 tests.
- Dev server smoke test: `curl -I http://127.0.0.1:5173/` returned `200 OK`.

## Photoshop Divergences Worth Keeping

- The path overlay is visual and commit-gated, but not freely transformable with handles. Photoshop allows moving/scaling the path, while the lesson notes symmetry always affects the entire canvas regardless of the path's size.
- Multiple symmetry paths in the Paths panel and `Make Symmetry Path` context switching are deferred.
- Wavy, Circle, Spiral, and Parallel Lines are deterministic approximations of Photoshop's private path engine.
