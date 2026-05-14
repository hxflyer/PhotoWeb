# 028 how-to-keep-images-centered-after-cropping
- Lesson path: `doc/photoshop-essentials-basics/how-to-keep-images-centered-after-cropping/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 06-crop

## Lesson Expectations
- Demonstrates selection crop and Crop Tool Classic Mode leaving cropped image off-center because Photoshop Overscroll is enabled; solution is to turn Overscroll off.
- Screenshots include `2022-center-cropped-images-image-not-centered-after-crop-1566cd8d.jpg`, `2022-center-cropped-images-use-classic-mode-crop-tool-21e3282b.png`, and `2022-center-cropped-images-uncheck-classic-mode-3a85493f.png`.

## Photoweb Coverage
- Image > Crop from selection and Crop Tool Classic Mode are implemented/tested (`src/test/06-crop.test.tsx:94`, `src/test/06-crop.test.tsx:135`).
- Overscroll is an explicit dropped navigation extra (`CLAUDE.md:141`, `doc/photoshop-essentials-basics/divergence-log.md:165`).

## Gaps / Mismatches
- No Overscroll preference exists by design; the Photoshop-specific centering bug/solution does not map cleanly to photoweb.
- Crop recentering should be verified visually if future pan/fit behavior changes.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
