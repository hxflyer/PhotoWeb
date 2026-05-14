# 187 background-layer
- Lesson path: `doc/photoshop-essentials-basics/background-layer/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `07b-background-layer`

## Lesson Expectations
- Opened image creates a locked italic Background layer with lock icon (`layers-background-layer-photoshop-layers-panel-c22dc256.png`).
- Background cannot move, reorder, accept transparency, or change blend/opacity/fill; deleting pixels fills with background color/FIll dialog (`layers-background-layer-photoshop-fill-dialog-1dd177bc.png`).
- Double-click lock or rename converts to Layer 0; normal layer can become Background.

## Photoweb Coverage
- Background layer state/locks are created in `src/store/documentSlice.ts:495`.
- Layer conversion and background restrictions live in `src/store/layersSlice.ts:169`.
- Layers panel disables blend/opacity/fill, italicizes Background, and lock-click converts in `src/components/Panels/LayersPanel.tsx:451` and `src/components/Panels/LayersPanel.tsx:986`.
- Tests cover creation, disabled controls, immovable stack behavior, and Background from Layer in `src/test/07b-background-layer.test.tsx:38`.

## Gaps / Mismatches
- Delete/cut selected pixels on Background should be checked against the lesson's Fill dialog expectation; evidence mainly covers eraser/opacity/fill/stack restrictions.

## Scope Decision
Fix.

## Recommended Follow-up
Add a test for Backspace/Delete on a selected Background area filling with background color or opening the expected Fill path.
