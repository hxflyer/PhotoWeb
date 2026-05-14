# 044 how-to-crop-images-photoshop-cc
- Lesson path: `doc/photoshop-essentials-basics/how-to-crop-images-photoshop-cc/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 06-crop

## Lesson Expectations
- Crop Tool (`C`) with resizable crop border, corner/edge handles, rule-of-thirds overlay, Options Bar aspect ratio controls, straighten button, commit with Enter/checkmark, cancel with Esc.
- `Delete Cropped Pixels` toggles destructive crop versus hidden retained pixels.
- Shortcuts/options: `X` swaps orientation, `O` cycles overlays, `H` hides cropped area, `P` toggles Classic Mode, Shift constrains during handle drag, Alt/Option resizes from center.
- Lesson has no local markdown image references in the extracted file, but the cluster aligns with the Photoshop crop lesson family.

## Photoweb Coverage
- Crop options model includes aspect, overlay, delete cropped pixels, straighten, classic mode, and hide cropped area in `src/tools/crop.ts:10`.
- Options Bar exposes aspect dimensions, swap, reset, Classic Mode, Hide, overlay selector, Straighten, and Delete Cropped Pixels in `src/components/Panels/OptionsBar.tsx:680` and `src/components/Panels/OptionsBar.tsx:717`.
- Crop key handling supports Enter, Esc, `O`, `H`, `P`, and `X` in `src/tools/crop.ts:275`.
- Non-destructive crop path preserves layer canvas content when Delete Cropped Pixels is off in `src/tools/crop.ts:485`.
- Tests cover `X`, `H`, `P`, Shift+`C`, Perspective Crop, and Image > Crop in `src/test/06-crop.test.tsx:74`.

## Gaps / Mismatches
- No visible Options Bar checkmark/cancel buttons noted in inspected code; commit/cancel are keyboard-driven.
- Browser crop implementation approximates Photoshop's crop UI but does not expose every crop preset/menu behavior from the larger crop family.
- Straighten rotates the whole canvas and resets crop, but no content-aware fill is included, which is correctly excluded elsewhere.

## Scope Decision
divergence already accepted

## Recommended Follow-up
Add explicit checkmark/cancel controls to the Crop Options Bar if Photoshop muscle-memory polish is revisited.

