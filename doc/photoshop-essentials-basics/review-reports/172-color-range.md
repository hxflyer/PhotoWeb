# 172 color-range
- Lesson path: `doc/photoshop-essentials-basics/color-range/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `14b-color-range`

## Lesson Expectations
- Select > Color Range opens a command dialog, not a toolbar tool; `selections-color-range-select-color-range-4413effd.gif`.
- Dialog supports Sampled Colors, eyedropper/add/subtract eyedroppers, preview thumbnail, Fuzziness, Localized Color Clusters, selection preview modes, presets, and Invert.
- Shift adds samples and Alt/Option subtracts samples.

## Photoweb Coverage
- Color Range dialog exists in `src/components/Dialogs/ColorRangeDialog.tsx:299`.
- Color range mask builder supports sampled colors, add/subtract samples, fuzziness, localized range, presets, invert, and selection combine modes in `src/tools/colorRange.ts:10`.
- Tests cover partial-alpha fuzziness and persisted dialog controls in `src/test/14b-color-range.test.tsx:35`.

## Gaps / Mismatches
- Need to verify keyboard-modifier sampling inside the dialog against Photoshop's Shift/Alt sample add/subtract habit; code search shows add/sub sample modes but not an obvious modifier test.
- Preview-mode visual parity may be approximate compared with Photoshop's On Black/On White/Quick Mask previews.

## Scope Decision
Fix.

## Recommended Follow-up
Add tests for Shift/Alt sampling behavior in Color Range and audit preview-mode labels against the lesson screenshots.
