# 075 type-changes-photoshop-cc-2019
- Lesson path: `doc/photoshop-essentials-basics/type-changes-photoshop-cc-2019/lesson.md`
- Scope status: `out_of_scope: version_changelog`
- Cluster coverage: none

## Lesson Expectations
- Type Tool click creates live Lorem Ipsum placeholder preview; font and size changes preview live before user types.
- Clicking away commits text; Options Bar checkmark no longer required.
- Free Transform scales type proportionally by default; Shift unlocks, Alt/Option scales from center.
- Screenshots grounding UI: `2019-type-changes-live-type-preview-photoshopcc2019-d6c845f8.jpg`, `2019-type-changes-choose-font-options-bar-84595db2.png`, `2019-type-changes-commit-text-by-clicking-away-5410d1bc.jpg`.

## Photoweb Coverage
- Type Tool basics are in scope under cluster 24, with Options Bar color and type overlay tests in `src/test/24-type-basics.test.tsx:133` and `src/test/typeOverlay.test.tsx`.
- Free Transform supports type layers and Alt center scaling in `src/components/Canvas/FreeTransformOverlay.tsx:390`.

## Gaps / Mismatches
- This specific CC 2019 "new type changes" lesson is excluded as a version-changelog lesson.
- If Photoweb lacks Lorem Ipsum placeholder preview/click-away commit, that should be tracked under Type basics rather than this out-of-scope lesson.

## Scope Decision
out of scope

## Recommended Follow-up
No action for CC 2019 changelog framing; ensure Type basics reports cover placeholder and commit behavior.

