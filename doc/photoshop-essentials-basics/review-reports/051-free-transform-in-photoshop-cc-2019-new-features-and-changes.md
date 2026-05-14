# 051 free-transform-in-photoshop-cc-2019-new-features-and-changes
- Lesson path: `doc/photoshop-essentials-basics/free-transform-in-photoshop-cc-2019-new-features-and-changes/lesson.md`
- Scope status: `out_of_scope: version_changelog`
- Cluster coverage: none

## Lesson Expectations
- Photoshop CC 2019/2020 changed Free Transform scaling: proportional by default for most layer types; Shift unlocks non-proportional scaling.
- Alt/Option scales from center; type and shape layers also scale proportionally by default in newer versions.
- Screenshots grounding UI: `2019-free-transform-select-free-transform-photoshop-39939bb9.png`, `free-transform-cc2020-scale-image-proportionally-photoshop-4b0851ad.jpg`, `free-transform-cc2020-scale-image-non-proportionally-cafa8acc.jpg`.

## Photoweb Coverage
- Free Transform exists and supports scale/rotate/move, Enter/Esc, Alt from center, Shift constrain, and modifier modes in `src/components/Canvas/FreeTransformOverlay.tsx:117` and `src/components/Canvas/FreeTransformOverlay.tsx:236`.
- The code explicitly keeps legacy semantics: Shift constrains proportions in `src/components/Canvas/FreeTransformOverlay.tsx:236`.
- Tests cover free transform behavior in `src/test/19a-free-transform.test.tsx:32` and `src/test/freeTransformModifiers.test.tsx`.

## Gaps / Mismatches
- Photoweb does not follow the CC 2019+ default-proportional behavior from this version-changelog lesson.
- The code comment calls this a deliberate legacy muscle-memory choice, but it should be logged if not already in the divergence log.

## Scope Decision
divergence already accepted

## Recommended Follow-up
Ensure the legacy Shift-constrain behavior is recorded in `divergence-log.md` if not already present.

