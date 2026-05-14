# 216 magnetic-lasso-tool
- Lesson path: `doc/photoshop-essentials-basics/magnetic-lasso-tool/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `13-lasso`

## Lesson Expectations
- Magnetic Lasso snaps selection segments to high-contrast edges while the user traces around an object.
- Options Bar exposes Width, Edge Contrast, and Frequency; Caps Lock toggles precision circle; bracket keys adjust width; Delete/Backspace removes anchor points.
- Manual anchors can be clicked; close by returning to start or double-click; Shift/Alt modifiers add/subtract.
- UI screenshots: `selections-magnetic-lasso-tool-magnetic-lasso-tool-circle-icon-e61232d7.gif`, `selections-magnetic-lasso-tool-magnetic-lasso-tool-width-7e4ae8d2.gif`, `selections-magnetic-lasso-tool-delete-anchor-point-0a2fb6f3.jpg`.

## Photoweb Coverage
- Magnetic Lasso tool is registered and edge-snaps/commits selections (`src/tools/magneticLasso.ts:126-235`).
- Toolbar flyout exposes Magnetic Lasso beside Lasso and Polygonal Lasso (`src/components/Panels/Toolbar.tsx:41-44`).
- Options Bar exposes Width, Contrast, and Frequency (`src/components/Panels/OptionsBar.tsx:437-482`).
- Tests cover toolbar exposure and options (`src/test/13-lasso.test.tsx:20-41`) plus tool behavior (`src/test/magneticLasso.test.ts`).

## Gaps / Mismatches
- I did not find evidence for Caps Lock precision-circle UI or bracket/comma/period keyboard adjustment coverage.
- The lesson’s temporary switching among lasso tools with modifiers is still a likely divergence.

## Scope Decision
Fix.

## Recommended Follow-up
Add precision cursor/width-key tests and decide whether temporary mid-selection lasso switching belongs in scope.
