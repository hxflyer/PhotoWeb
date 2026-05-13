# 14b Color Range Gap Report

## Lesson read

- `color-range/lesson.md`

## Photoshop behavior to cover

- `Select > Color Range...` opens a modal command rather than selecting a toolbar tool.
- `Select` defaults to Sampled Colors and can use named color/tone presets.
- Eyedropper sampling supports replace, Shift add, and Alt/Option subtract.
- Fuzziness creates a continuous grayscale mask with partial pixel selection, not a binary Magic Wand-style mask.
- Localized Color Clusters enables a Range control that limits matches around sampled coordinates.
- Preview can show Selection or Image in the dialog, and Selection Preview modes include None, Grayscale, Black Matte/On Black, White Matte/On White, and Quick Mask.
- Invert flips the mask before committing.

## Current app state

- Color Range already opens from the Select menu and Properties mask button.
- Sampled Colors, named presets, add/subtract samples, Fuzziness, Invert, Localized Color Clusters, Range, and the 300x200 preview canvas already exist.
- Existing sampled-color matching is binary: pixels are either 0 or 255.
- The preview canvas only renders grayscale selection output.
- Store preferences for Color Range exist but the dialog resets to hard-coded defaults on every open.

## Gaps to close

- Convert sampled-color matching to a continuous mask with grayscale falloff.
- Add dialog preview modes for Selection/Image and Grayscale, Quick Mask, On Black, and On White.
- Persist and restore the Color Range Select/Fuzziness/Localized/Range/Invert settings.
- Add tests that protect continuous mask behavior and preview mode rendering.

## Intentional divergence

- Photoshop's Load/Save buttons for external Color Range settings are not implemented in this tick.
