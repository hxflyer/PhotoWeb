# 089 photoshop-crop-tool-tips-and-tricks
- Lesson path: `doc/photoshop-essentials-basics/photoshop-crop-tool-tips-and-tricks/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `06-crop`

## Lesson Expectations
- C selects Crop; Shift constrains aspect, Alt/Option resizes from center, Shift+Alt combines them (`cc-crop-tool-tips-tricks-crop-tool-lock-aspect-ratio-b4ca700b.jpg`).
- X swaps orientation, H hides cropped area, P toggles Classic Mode, Ctrl/Cmd temporarily straightens, Esc cancels, Enter/checkmark commits.
- Overlay icon cycles Rule of Thirds, Grid, Diagonal, Triangle, Golden Ratio, etc. (`cc-crop-tool-tips-tricks-photoshop-crop-overlays-319531f4.png`).

## Photoweb Coverage
- Crop tool supports aspect, overlays, Delete Cropped Pixels, Classic Mode, hide cropped area, Straighten, Escape and Enter (`src/tools/crop.ts:35`, `src/tools/crop.ts:276`, `src/tools/crop.ts:291`).
- Options Bar exposes Crop controls (`src/components/Panels/OptionsBar.tsx:664`).
- Tests cover Shift constrain, Alt center resize, X, H, P, overlays, Straighten, Perspective Crop, and crop history (`src/test/cropSliceF.test.ts:50`, `src/test/06-crop.test.tsx:78`, `src/test/cropOverlay.test.ts:31`).

## Gaps / Mismatches
- The Options Bar appears to expose Straighten as a checkbox, while the lesson expects temporary Ctrl/Cmd Straighten from the active Crop Tool; code supports straighten mode but this exact modifier choreography was not clearly covered.
- Photoshop's crop checkmark/cancel buttons in the Options Bar were not found as explicit controls.

## Scope Decision
Fix: modifier choreography and commit/cancel affordances matter for Photoshop-fluent cropping.

## Recommended Follow-up
Add/verify Ctrl/Cmd temporary Straighten tests and visible Options Bar commit/cancel buttons.
