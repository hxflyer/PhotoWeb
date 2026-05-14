# 105 upscale-images-photoshop-cc-2018
- Lesson path: `doc/photoshop-essentials-basics/upscale-images-photoshop-cc-2018/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `05a-image-size`

## Lesson Expectations
- Enable Preserve Details 2.0 in Technology Previews, open Image Size, set width/height to 400%, choose Preserve Details 2.0, adjust Reduce Noise, and compare algorithms (`2018-preserve-details-2-photoshop-choose-preserve-details-2.0-a039d31d.png`, `2018-preserve-details-2-photoshop-preserve-details-2-comparison-490b6cb0.jpg`).

## Photoweb Coverage
- Image Size lists Preserve Details and Preserve Details 2.0 labels (`src/components/Dialogs/ImageSizeDialog.tsx:18`).
- Automatic, bicubic smoother/sharper, bicubic, bilinear, and nearest resampling are implemented (`src/core/imageTransforms.ts:18`, `src/core/imageTransforms.ts:118`).
- Divergence log notes proprietary Preserve Details behavior cannot be matched exactly (`doc/photoshop-essentials-basics/divergence-log.md:323`).

## Gaps / Mismatches
- Preserve Details / Preserve Details 2.0 are labels without Adobe's proprietary algorithm or Reduce Noise control.
- Technology Previews preference is absent, which is acceptable if the algorithm is exposed directly.

## Scope Decision
Divergence already accepted.

## Recommended Follow-up
If the Preserve Details options remain visible, add tooltip/help text or an internal mapping so users are not misled into expecting Adobe AI-quality upscaling.
