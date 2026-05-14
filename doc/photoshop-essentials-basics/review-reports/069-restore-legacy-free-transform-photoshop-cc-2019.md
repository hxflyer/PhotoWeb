# 069 restore-legacy-free-transform-photoshop-cc-2019
- Lesson path: `doc/photoshop-essentials-basics/restore-legacy-free-transform-photoshop-cc-2019/lesson.md`
- Scope status: `out_of_scope: legacy_ui`
- Cluster coverage: none

## Lesson Expectations
- Preferences > General checkbox `Use Legacy Free Transform` restores pre-CC 2019 behavior.
- Legacy behavior: handles scale non-proportionally by default, Shift constrains proportions; preference takes effect immediately.
- Screenshots grounding UI: `2019-legacy-free-transform-open-photoshop-preferences-86f0fb1f.png`, `2019-legacy-free-transform-use-legacy-free-transform-photoshop-aba1b181.png`, `2019-legacy-free-transform-scale-image-non-proportionally-photoshop-78f5cb45.jpg`.

## Photoweb Coverage
- Photoweb already uses legacy-like Shift-constrain semantics in `src/components/Canvas/FreeTransformOverlay.tsx:236`.
- No preference toggle is needed for the excluded legacy UI lesson.

## Gaps / Mismatches
- No `Use Legacy Free Transform` preference.
- Since Photoweb defaults to legacy behavior, the preference would be redundant but should be documented as a divergence from current Photoshop.

## Scope Decision
out of scope

## Recommended Follow-up
No action beyond divergence-log verification for Free Transform default scaling.

